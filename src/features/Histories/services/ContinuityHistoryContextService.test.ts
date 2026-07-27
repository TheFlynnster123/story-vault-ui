import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import type { ChatEvent } from "../../../services/CQRS/events/ChatEvent";
import { d } from "../../../services/Dependencies";
import {
  createDefaultContinuityHistoryStore,
  type ContinuityHistory,
  type ContinuityHistoryStore,
} from "./ContinuityHistory";
import { ContinuityHistoryContextService } from "./ContinuityHistoryContextService";

vi.mock("../../../services/Dependencies");

describe("ContinuityHistoryContextService", () => {
  const historiesService = { get: vi.fn() };
  const api = { postStructuredChat: vi.fn() };
  const eventService = {
    Initialize: vi.fn(),
    Events: [] as ChatEvent[],
  };
  const errorService = { log: vi.fn() };
  const messages = [
    message("m1", "user", "Mara finds a brass key."),
    message("m2", "assistant", "She carries it toward the lighthouse."),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    historiesService.get.mockResolvedValue(createStore());
    api.postStructuredChat.mockResolvedValue({
      selectedHistories: [
        { historyId: "key", reason: "The key is in the current scene." },
      ],
    });
    eventService.Initialize.mockResolvedValue(undefined);
    eventService.Events = [];
    vi.mocked(d.ContinuityHistoriesService).mockReturnValue(
      historiesService as never,
    );
    vi.mocked(d.OpenRouterChatAPI).mockReturnValue(api as never);
    vi.mocked(d.ChatEventService).mockReturnValue(eventService as never);
    vi.mocked(d.ErrorService).mockReturnValue(errorService as never);
  });

  it("does no selection work when the feature is disabled", async () => {
    historiesService.get.mockResolvedValue(
      createStore({ settings: { enabled: false } }),
    );

    const result = await new ContinuityHistoryContextService(
      "chat-1",
    ).buildContext(messages);

    expect(result.messages).toEqual([]);
    expect(result.selections).toEqual([]);
    expect(api.postStructuredChat).not.toHaveBeenCalled();
  });

  it("renders always-included and model-selected Histories with reasons", async () => {
    historiesService.get.mockResolvedValue(
      createStore({
        histories: [
          createHistory("oath", "The Winter Oath", "always"),
          createHistory("key", "The Brass Key", "automatic"),
        ],
      }),
    );

    const result = await new ContinuityHistoryContextService(
      "chat-1",
    ).buildContext(messages);

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toContain("## The Winter Oath");
    expect(result.messages[0].content).toContain("## The Brass Key");
    expect(result.selections).toEqual([
      expect.objectContaining({
        historyId: "oath",
        reason: "Configured to always include.",
      }),
      expect.objectContaining({
        historyId: "key",
        reason: "The key is in the current scene.",
      }),
    ]);
  });

  it("uses local overlap selection without making a model request", async () => {
    historiesService.get.mockResolvedValue(
      createStore({
        settings: { useLlmSelection: false },
        histories: [
          createHistory("key", "The Brass Key", "automatic", [
            "lighthouse",
          ]),
          createHistory("war", "The Northern War", "automatic"),
        ],
      }),
    );

    const result = await new ContinuityHistoryContextService(
      "chat-1",
    ).buildContext(messages);

    expect(result.selections.map((selection) => selection.historyId)).toEqual([
      "key",
    ]);
    expect(api.postStructuredChat).not.toHaveBeenCalled();
  });

  it("uses the newest revision available before a regeneration target", async () => {
    const history = createHistory("key", "The Brass Key", "always");
    history.revisions = [
      {
        ...history.revisions[0],
        id: "revision-before",
        content: "The key is hidden.",
        coveredThroughMessageId: "m1",
      },
      {
        ...history.revisions[0],
        id: "revision-after",
        content: "The key was destroyed.",
        coveredThroughMessageId: "m3",
      },
    ];
    historiesService.get.mockResolvedValue(
      createStore({ histories: [history] }),
    );
    eventService.Events = [
      created("m1", "First"),
      created("m2", "Target"),
      created("m3", "Later"),
    ];

    const result = await new ContinuityHistoryContextService(
      "chat-1",
    ).buildContext([messages[0]], "m2");

    expect(result.messages[0].content).toContain("The key is hidden.");
    expect(result.messages[0].content).not.toContain("destroyed");
    expect(result.selections[0].revisionId).toBe("revision-before");
  });

  it("rejects unknown and duplicate model selections and enforces the cap", async () => {
    historiesService.get.mockResolvedValue(
      createStore({
        settings: { maxSelectedHistories: 1 },
        histories: [
          createHistory("key", "The Key", "automatic"),
          createHistory("war", "The War", "automatic"),
        ],
      }),
    );
    api.postStructuredChat.mockResolvedValue({
      selectedHistories: [
        { historyId: "unknown", reason: "No." },
        { historyId: "key", reason: "Relevant." },
        { historyId: "key", reason: "Duplicate." },
        { historyId: "war", reason: "Over the cap." },
      ],
    });

    const result = await new ContinuityHistoryContextService(
      "chat-1",
    ).buildContext(messages);

    expect(result.selections.map((selection) => selection.historyId)).toEqual([
      "key",
    ]);
  });
});

const createStore = (
  overrides: {
    settings?: Partial<ContinuityHistoryStore["settings"]>;
    histories?: ContinuityHistory[];
  } = {},
): ContinuityHistoryStore => {
  const store = createDefaultContinuityHistoryStore();
  return {
    ...store,
    settings: {
      ...store.settings,
      enabled: true,
      ...overrides.settings,
    },
    histories: overrides.histories ?? [
      createHistory("key", "The Brass Key", "automatic"),
    ],
  };
};

const createHistory = (
  id: string,
  title: string,
  inclusion: ContinuityHistory["inclusion"],
  routingHints: string[] = [],
): ContinuityHistory => ({
  id,
  title,
  description: `Track ${title}.`,
  kind: "custom",
  routingHints,
  inclusion,
  revisions: [
    {
      id: `${id}-revision`,
      content: `${title} is still important.`,
      sourceMessageIds: ["m1"],
      coveredThroughMessageId: "m1",
      createdAt: "2026-01-01T00:00:00.000Z",
      origin: "llm",
    },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const message = (
  id: string,
  role: "user" | "assistant",
  content: string,
): LLMMessage => ({
  id,
  type: "message",
  role,
  content,
});

const created = (messageId: string, content: string): ChatEvent => ({
  type: "MessageCreated",
  messageId,
  role: "assistant",
  content,
});
