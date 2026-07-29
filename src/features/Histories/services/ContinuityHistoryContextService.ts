import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import type { ChatEvent } from "../../../services/CQRS/events/ChatEvent";
import { d } from "../../../services/Dependencies";
import {
  toSystemMessage,
  toUserMessage,
} from "../../../services/Utils/MessageUtils";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";
import {
  getLatestHistoryRevision,
  type ContinuityHistory,
  type ContinuityHistoryRevision,
  type ContinuityHistoryStore,
} from "./ContinuityHistory";

export interface SelectedContinuityHistory {
  historyId: string;
  revisionId: string;
  title: string;
  reason: string;
}

export interface ContinuityHistoryContextResult {
  messages: LLMMessage[];
  selections: SelectedContinuityHistory[];
  trailingMessageCount: number;
}

interface EligibleHistory {
  history: ContinuityHistory;
  revision: ContinuityHistoryRevision;
}

interface HistorySelectionResponse {
  selectedHistories?: Array<{
    historyId: string;
    reason: string;
  }>;
}

const HISTORY_SELECTION_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "continuity_history_selection",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["selectedHistories"],
      properties: {
        selectedHistories: {
          type: "array",
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["historyId", "reason"],
            properties: {
              historyId: { type: "string" },
              reason: { type: "string", minLength: 1, maxLength: 240 },
            },
          },
        },
      },
    },
  },
};

export const getContinuityHistoryContextServiceInstance = createInstanceCache(
  (chatId: string) => new ContinuityHistoryContextService(chatId),
);

export class ContinuityHistoryContextService {
  private readonly chatId: string;
  private selectionCache = new Map<
    string,
    Promise<Array<{ historyId: string; reason: string }>>
  >();

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  async buildContext(
    contextMessages: LLMMessage[],
    beforeMessageId?: string,
  ): Promise<ContinuityHistoryContextResult> {
    const store = await d.ContinuityHistoriesService(this.chatId).get();
    if (!store.settings.enabled) {
      return emptyContext(store.settings.contextTrailingMessages);
    }

    const eligibleHistories = await this.getEligibleHistories(
      store,
      beforeMessageId,
    );
    const alwaysIncluded = eligibleHistories.filter(
      ({ history }) => history.inclusion === "always",
    );
    const automatic = eligibleHistories.filter(
      ({ history }) => history.inclusion === "automatic",
    );

    const automaticSelections = await this.selectAutomaticHistories(
      store,
      automatic,
      contextMessages,
      beforeMessageId,
    );
    const reasonsById = new Map(
      automaticSelections.map((selection) => [
        selection.historyId,
        selection.reason,
      ]),
    );

    const selected = [
      ...alwaysIncluded.map((entry) => ({
        entry,
        reason: "Configured to always include.",
      })),
      ...automatic
        .filter(({ history }) => reasonsById.has(history.id))
        .map((entry) => ({
          entry,
          reason: reasonsById.get(entry.history.id)!,
        })),
    ];

    return {
      messages:
        selected.length === 0
          ? []
          : [
              toSystemMessage(
                [
                  "# Relevant Continuity Histories",
                  ...selected.map(({ entry }) =>
                    [
                      `## ${entry.history.title}`,
                      entry.revision.content,
                    ].join("\n"),
                  ),
                ].join("\n\n"),
              ),
            ],
      selections: selected.map(({ entry, reason }) => ({
        historyId: entry.history.id,
        revisionId: entry.revision.id,
        title: entry.history.title,
        reason,
      })),
      trailingMessageCount: store.settings.contextTrailingMessages,
    };
  }

  private async getEligibleHistories(
    store: ContinuityHistoryStore,
    beforeMessageId?: string,
  ): Promise<EligibleHistory[]> {
    if (!beforeMessageId) {
      return store.histories.flatMap((history) => {
        if (history.inclusion === "never") return [];
        const revision = getLatestHistoryRevision(history);
        return revision ? [{ history, revision }] : [];
      });
    }

    await d.ChatEventService(this.chatId).Initialize();
    const positions = getMessageEventPositions(
      d.ChatEventService(this.chatId).Events ?? [],
    );
    const cutoffPosition = positions.get(beforeMessageId);
    if (cutoffPosition === undefined) return [];

    return store.histories.flatMap((history) => {
      if (history.inclusion === "never") return [];
      const revision = findRevisionBefore(
        history.revisions,
        cutoffPosition,
        positions,
      );
      return revision ? [{ history, revision }] : [];
    });
  }

  private async selectAutomaticHistories(
    store: ContinuityHistoryStore,
    candidates: EligibleHistory[],
    contextMessages: LLMMessage[],
    beforeMessageId?: string,
  ): Promise<Array<{ historyId: string; reason: string }>> {
    if (candidates.length === 0) return [];

    const recentMessages = contextMessages
      .filter(
        (message) => message.type === "message" && message.id !== undefined,
      )
      .slice(-store.settings.selectionLookbackMessages);
    if (recentMessages.length === 0) return [];

    if (!store.settings.useLlmSelection) {
      return selectByLexicalOverlap(
        candidates,
        recentMessages,
        store.settings.maxSelectedHistories,
      );
    }

    const cacheKey = JSON.stringify({
      beforeMessageId,
      recentMessageIds: recentMessages.map((message) => message.id),
      candidates: candidates.map(({ history, revision }) => [
        history.id,
        history.updatedAt,
        revision.id,
      ]),
      prompt: store.settings.selectionPrompt,
      model: store.settings.model,
      maximum: store.settings.maxSelectedHistories,
    });
    const cached = this.selectionCache.get(cacheKey);
    if (cached) return cached;

    const selection = this.requestSelection(
      store,
      candidates,
      recentMessages,
    ).catch((error) => {
      d.ErrorService().log(
        "Failed to select continuity histories; using local fallback",
        error,
      );
      return selectByLexicalOverlap(
        candidates,
        recentMessages,
        store.settings.maxSelectedHistories,
      );
    });
    this.selectionCache.set(cacheKey, selection);
    this.trimSelectionCache();
    return selection;
  }

  private async requestSelection(
    store: ContinuityHistoryStore,
    candidates: EligibleHistory[],
    recentMessages: LLMMessage[],
  ): Promise<Array<{ historyId: string; reason: string }>> {
    const response = await d
      .OpenRouterChatAPI()
      .postStructuredChat<HistorySelectionResponse>(
        [
          toSystemMessage(
            [
              store.settings.selectionPrompt,
              "",
              `Select at most ${store.settings.maxSelectedHistories} Histories.`,
              "Return only the configured structured response.",
            ].join("\n"),
          ),
          ...recentMessages,
          toUserMessage(
            JSON.stringify({
              candidates: candidates.map(({ history, revision }) => ({
                id: history.id,
                title: history.title,
                description: history.description,
                kind: history.kind,
                routingHints: history.routingHints,
                currentStateExcerpt: revision.content.slice(0, 500),
              })),
            }),
          ),
        ],
        HISTORY_SELECTION_RESPONSE_FORMAT,
        store.settings.model || undefined,
        "Continuity History Selection",
        false,
        store.settings.requestSettings,
        "history-selection",
      );

    const candidateIds = new Set(
      candidates.map(({ history }) => history.id),
    );
    const selectedIds = new Set<string>();
    const selections: Array<{ historyId: string; reason: string }> = [];

    for (const selection of response.selectedHistories ?? []) {
      const historyId = selection?.historyId?.trim();
      const reason = selection?.reason?.trim();
      if (
        !historyId ||
        !reason ||
        !candidateIds.has(historyId) ||
        selectedIds.has(historyId)
      ) {
        continue;
      }
      selectedIds.add(historyId);
      selections.push({ historyId, reason });
      if (selections.length >= store.settings.maxSelectedHistories) break;
    }
    return selections;
  }

  private trimSelectionCache(): void {
    while (this.selectionCache.size > 20) {
      const oldestKey = this.selectionCache.keys().next().value;
      if (oldestKey === undefined) return;
      this.selectionCache.delete(oldestKey);
    }
  }
}

const findRevisionBefore = (
  revisions: ContinuityHistoryRevision[],
  cutoffPosition: number,
  positions: Map<string, number>,
): ContinuityHistoryRevision | undefined => {
  for (let index = revisions.length - 1; index >= 0; index--) {
    const boundaryId = revisions[index].coveredThroughMessageId;
    if (!boundaryId) continue;
    const boundaryPosition = positions.get(boundaryId);
    if (
      boundaryPosition !== undefined &&
      boundaryPosition < cutoffPosition
    ) {
      return revisions[index];
    }
  }
  return undefined;
};

const getMessageEventPositions = (
  events: ChatEvent[],
): Map<string, number> => {
  const positions = new Map<string, number>();
  events.forEach((event, index) => {
    if (
      event.type === "UserMessageCreated" ||
      event.type === "AssistantResponseCreated" ||
      event.type === "InstructionCreated" ||
      event.type === "ReasoningCreated" ||
      event.type === "PlanCreated"
    ) {
      positions.set(event.messageId, index);
    }
  });
  return positions;
};

const selectByLexicalOverlap = (
  candidates: EligibleHistory[],
  recentMessages: LLMMessage[],
  maximum: number,
): Array<{ historyId: string; reason: string }> => {
  const recentTokens = tokenize(
    recentMessages.map((message) => message.content).join(" "),
  );

  return candidates
    .map(({ history, revision }) => {
      const metadataTokens = tokenize(
        [
          history.title,
          history.description,
          history.routingHints.join(" "),
          revision.content.slice(0, 500),
        ].join(" "),
      );
      const matchingTokens = [...metadataTokens].filter((token) =>
        recentTokens.has(token),
      );
      return {
        historyId: history.id,
        matchingTokens,
      };
    })
    .filter(({ matchingTokens }) => matchingTokens.length > 0)
    .sort(
      (left, right) =>
        right.matchingTokens.length - left.matchingTokens.length,
    )
    .slice(0, maximum)
    .map(({ historyId, matchingTokens }) => ({
      historyId,
      reason: `Recent context matches: ${matchingTokens.slice(0, 4).join(", ")}.`,
    }));
};

const tokenize = (value: string): Set<string> =>
  new Set(
    value
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}][\p{L}\p{N}'’-]{2,}/gu)
      ?.filter((token) => !STOP_WORDS.has(token)) ?? [],
  );

const STOP_WORDS = new Set([
  "and",
  "are",
  "but",
  "for",
  "from",
  "had",
  "has",
  "have",
  "her",
  "his",
  "not",
  "that",
  "the",
  "their",
  "there",
  "they",
  "this",
  "was",
  "were",
  "with",
]);

const emptyContext = (
  trailingMessageCount: number,
): ContinuityHistoryContextResult => ({
  messages: [],
  selections: [],
  trailingMessageCount,
});
