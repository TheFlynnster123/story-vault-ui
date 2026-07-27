import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import {
  toSystemMessage,
  toUserMessage,
} from "../../../services/Utils/MessageUtils";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";
import {
  normalizeRoutingHints,
  type ContinuityHistory,
  type ContinuityHistoryKind,
  type ContinuityHistoryRevision,
  type ContinuityHistoryStore,
} from "./ContinuityHistory";

export type ContinuityHistoryRefreshStatus =
  | "disabled"
  | "waiting"
  | "unchanged"
  | "updated"
  | "failed";

export interface ContinuityHistoryRefreshResult {
  status: ContinuityHistoryRefreshStatus;
  updatedCount: number;
  discoveredCount: number;
  messagesUntilRefresh?: number;
}

interface HistoryRefreshResponse {
  updates?: HistoryRefreshUpdate[];
  discoveries?: HistoryRefreshDiscovery[];
}

interface HistoryRefreshUpdate {
  historyId: string;
  content: string;
  routingHints: string[];
  sourceMessageIds: string[];
}

interface HistoryRefreshDiscovery {
  title: string;
  description: string;
  kind: ContinuityHistoryKind;
  content: string;
  routingHints: string[];
  sourceMessageIds: string[];
}

const HISTORY_REFRESH_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "continuity_history_refresh",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["updates", "discoveries"],
      properties: {
        updates: {
          type: "array",
          maxItems: 30,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "historyId",
              "content",
              "routingHints",
              "sourceMessageIds",
            ],
            properties: {
              historyId: { type: "string" },
              content: { type: "string", minLength: 1, maxLength: 6000 },
              routingHints: {
                type: "array",
                maxItems: 30,
                items: { type: "string", minLength: 1, maxLength: 100 },
              },
              sourceMessageIds: {
                type: "array",
                maxItems: 50,
                items: { type: "string" },
              },
            },
          },
        },
        discoveries: {
          type: "array",
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "title",
              "description",
              "kind",
              "content",
              "routingHints",
              "sourceMessageIds",
            ],
            properties: {
              title: { type: "string", minLength: 1, maxLength: 100 },
              description: { type: "string", minLength: 1, maxLength: 500 },
              kind: {
                type: "string",
                enum: [
                  "plot-thread",
                  "place",
                  "object",
                  "faction",
                  "relationship",
                  "constraint",
                  "world-state",
                  "custom",
                ],
              },
              content: { type: "string", minLength: 1, maxLength: 6000 },
              routingHints: {
                type: "array",
                maxItems: 30,
                items: { type: "string", minLength: 1, maxLength: 100 },
              },
              sourceMessageIds: {
                type: "array",
                maxItems: 50,
                items: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

export const getContinuityHistoryMaintenanceServiceInstance =
  createInstanceCache(
    (chatId: string) => new ContinuityHistoryMaintenanceService(chatId),
  );

export class ContinuityHistoryMaintenanceService {
  private readonly chatId: string;
  private inFlight?: Promise<ContinuityHistoryRefreshResult>;
  private refreshingHistoryIds = new Set<string>();
  private subscribers = new Set<() => void>();

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  subscribe = (callback: () => void): (() => void) => {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  };

  isRefreshing = (historyId?: string): boolean =>
    historyId
      ? this.refreshingHistoryIds.has(historyId)
      : this.refreshingHistoryIds.size > 0;

  async onSavedUserTurn(): Promise<ContinuityHistoryRefreshResult> {
    const service = d.ContinuityHistoriesService(this.chatId);
    const store = await service.get();
    if (!store.settings.enabled) return emptyResult("disabled");

    const nextCount = store.settings.messagesSinceLastRefresh + 1;
    if (nextCount < store.settings.refreshInterval) {
      await service.updateSettings({
        messagesSinceLastRefresh: nextCount,
      });
      return {
        ...emptyResult("waiting"),
        messagesUntilRefresh: store.settings.refreshInterval - nextCount,
      };
    }

    await service.updateSettings({ messagesSinceLastRefresh: 0 });
    return this.refresh();
  }

  refresh(historyId?: string): Promise<ContinuityHistoryRefreshResult> {
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.runRefresh(historyId).finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async runRefresh(
    historyId?: string,
  ): Promise<ContinuityHistoryRefreshResult> {
    const service = d.ContinuityHistoriesService(this.chatId);
    const store = await service.get();
    if (!store.settings.enabled) return emptyResult("disabled");

    const requestedHistories = historyId
      ? store.histories.filter((history) => history.id === historyId)
      : store.histories;
    const canDiscover = historyId === undefined && store.settings.autoDiscover;
    if (requestedHistories.length === 0 && !canDiscover) {
      return emptyResult("unchanged");
    }

    this.setRefreshing(
      historyId ? [historyId] : requestedHistories.map((history) => history.id),
      true,
    );

    try {
      await d.ChatEventService(this.chatId).Initialize();
      const recentMessages = this.getRecentStoryMessages(store);
      if (recentMessages.length === 0) return emptyResult("unchanged");

      const boundaryId = recentMessages[recentMessages.length - 1].id;
      const response = await d
        .OpenRouterChatAPI()
        .postStructuredChat<HistoryRefreshResponse>(
          buildRefreshMessages(
            store,
            requestedHistories,
            recentMessages,
            canDiscover,
          ),
          HISTORY_REFRESH_RESPONSE_FORMAT,
          store.settings.model || undefined,
          "Continuity History Refresh",
          false,
          store.settings.requestSettings,
          "history-refresh",
        );

      const latestStore = await service.get();
      const applied = applyRefreshResponse(
        latestStore,
        response,
        new Set(requestedHistories.map((history) => history.id)),
        new Set(recentMessages.flatMap((message) => message.id ?? [])),
        boundaryId,
        canDiscover,
      );
      await service.save(applied.store);
      return {
        status:
          applied.updatedCount + applied.discoveredCount > 0
            ? "updated"
            : "unchanged",
        updatedCount: applied.updatedCount,
        discoveredCount: applied.discoveredCount,
      };
    } catch (error) {
      d.ErrorService().log("Failed to refresh continuity histories", error);
      return emptyResult("failed");
    } finally {
      this.setRefreshing(
        historyId
          ? [historyId]
          : requestedHistories.map((history) => history.id),
        false,
      );
    }
  }

  private getRecentStoryMessages(
    store: ContinuityHistoryStore,
  ): LLMMessage[] {
    const messages = d
      .LLMChatProjection(this.chatId)
      .GetMessages({
        reasoningRetentionMessages: 0,
        messageCompressionAfterMessages: null,
        planSelection: { mode: "exclude-all" },
      })
      .filter(
        (message) => message.type === "message" && message.id !== undefined,
      );
    return messages.slice(-store.settings.refreshLookbackMessages);
  }

  private setRefreshing(historyIds: string[], refreshing: boolean): void {
    for (const historyId of historyIds) {
      if (refreshing) this.refreshingHistoryIds.add(historyId);
      else this.refreshingHistoryIds.delete(historyId);
    }
    this.subscribers.forEach((subscriber) => subscriber());
  }
}

const buildRefreshMessages = (
  store: ContinuityHistoryStore,
  histories: ContinuityHistory[],
  recentMessages: LLMMessage[],
  canDiscover: boolean,
): LLMMessage[] => [
  toSystemMessage(
    [
      store.settings.refreshPrompt,
      "",
      "Return only the configured structured response.",
      canDiscover
        ? "Discovery is enabled. Return only genuinely durable new subjects."
        : "Discovery is disabled. Return an empty discoveries array.",
    ].join("\n"),
  ),
  ...recentMessages,
  toUserMessage(
    JSON.stringify({
      histories: histories.map((history) => ({
        id: history.id,
        title: history.title,
        description: history.description,
        kind: history.kind,
        routingHints: history.routingHints,
        currentContent:
          history.revisions[history.revisions.length - 1]?.content ?? "",
      })),
      allowedSourceMessageIds: recentMessages.flatMap(
        (message) => message.id ?? [],
      ),
    }),
  ),
];

const applyRefreshResponse = (
  store: ContinuityHistoryStore,
  response: HistoryRefreshResponse,
  allowedHistoryIds: Set<string>,
  allowedSourceIds: Set<string>,
  boundaryId: string | undefined,
  canDiscover: boolean,
): {
  store: ContinuityHistoryStore;
  updatedCount: number;
  discoveredCount: number;
} => {
  const now = new Date().toISOString();
  const updatesById = new Map(
    (response.updates ?? [])
      .filter(
        (update) =>
          isValidUpdate(update) &&
          allowedHistoryIds.has(update.historyId) &&
          update.sourceMessageIds.some((id) => allowedSourceIds.has(id)),
      )
      .map((update) => [update.historyId, update]),
  );
  let updatedCount = 0;

  const histories = store.histories.map((history) => {
    const update = updatesById.get(history.id);
    if (!update) return history;

    const content = update.content.trim();
    const currentContent =
      history.revisions[history.revisions.length - 1]?.content.trim();
    if (!content || content === currentContent) return history;

    updatedCount++;
    return {
      ...history,
      routingHints: normalizeRoutingHints([
        ...history.routingHints,
        ...update.routingHints,
      ]),
      revisions: [
        ...history.revisions,
        createRevision(update, allowedSourceIds, boundaryId, now),
      ],
      updatedAt: now,
    };
  });

  const existingTitles = new Set(
    histories.map((history) => history.title.trim().toLocaleLowerCase()),
  );
  const discoveries = canDiscover
    ? (response.discoveries ?? [])
        .filter(isValidDiscovery)
        .filter((discovery) =>
          discovery.sourceMessageIds.some((id) =>
            allowedSourceIds.has(id),
          ),
        )
        .filter((discovery) => {
          const title = discovery.title.trim().toLocaleLowerCase();
          if (!title || existingTitles.has(title)) return false;
          existingTitles.add(title);
          return true;
        })
        .map((discovery) =>
          createDiscoveredHistory(
            discovery,
            allowedSourceIds,
            boundaryId,
            now,
          ),
        )
    : [];

  return {
    store: {
      ...store,
      settings: {
        ...store.settings,
        messagesSinceLastRefresh: 0,
      },
      histories: [...histories, ...discoveries],
    },
    updatedCount,
    discoveredCount: discoveries.length,
  };
};

const createRevision = (
  update: Pick<HistoryRefreshUpdate, "content" | "sourceMessageIds">,
  allowedSourceIds: Set<string>,
  boundaryId: string | undefined,
  createdAt: string,
): ContinuityHistoryRevision => ({
  id: crypto.randomUUID(),
  content: update.content.trim(),
  sourceMessageIds: [
    ...new Set(
      update.sourceMessageIds.filter((id) => allowedSourceIds.has(id)),
    ),
  ],
  coveredThroughMessageId: boundaryId,
  createdAt,
  origin: "llm",
});

const createDiscoveredHistory = (
  discovery: HistoryRefreshDiscovery,
  allowedSourceIds: Set<string>,
  boundaryId: string | undefined,
  createdAt: string,
): ContinuityHistory => ({
  id: crypto.randomUUID(),
  title: discovery.title.trim(),
  description: discovery.description.trim(),
  kind: discovery.kind,
  routingHints: normalizeRoutingHints(discovery.routingHints),
  inclusion: "automatic",
  revisions: [
    createRevision(discovery, allowedSourceIds, boundaryId, createdAt),
  ],
  createdAt,
  updatedAt: createdAt,
});

const isValidUpdate = (
  update: HistoryRefreshUpdate,
): update is HistoryRefreshUpdate =>
  typeof update?.historyId === "string" &&
  typeof update.content === "string" &&
  update.content.trim().length > 0 &&
  Array.isArray(update.routingHints) &&
  Array.isArray(update.sourceMessageIds);

const isValidDiscovery = (
  discovery: HistoryRefreshDiscovery,
): discovery is HistoryRefreshDiscovery =>
  typeof discovery?.title === "string" &&
  discovery.title.trim().length > 0 &&
  typeof discovery.description === "string" &&
  typeof discovery.content === "string" &&
  discovery.content.trim().length > 0 &&
  Array.isArray(discovery.routingHints) &&
  Array.isArray(discovery.sourceMessageIds);

const emptyResult = (
  status: ContinuityHistoryRefreshStatus,
): ContinuityHistoryRefreshResult => ({
  status,
  updatedCount: 0,
  discoveredCount: 0,
});
