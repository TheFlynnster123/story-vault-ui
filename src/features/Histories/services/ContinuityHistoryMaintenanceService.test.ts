import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import {
  createDefaultContinuityHistoryStore,
  type ContinuityHistoryStore,
} from "./ContinuityHistory";
import { ContinuityHistoryMaintenanceService } from "./ContinuityHistoryMaintenanceService";

vi.mock("../../../services/Dependencies");

describe("ContinuityHistoryMaintenanceService", () => {
  const histories = {
    get: vi.fn(),
    updateSettings: vi.fn(),
    save: vi.fn(),
  };
  const projection = { GetMessages: vi.fn() };
  const events = { Initialize: vi.fn() };
  const api = { postStructuredChat: vi.fn() };
  const errorService = { log: vi.fn() };
  let store: ContinuityHistoryStore;
  let service: ContinuityHistoryMaintenanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore();
    histories.get.mockImplementation(async () => store);
    histories.updateSettings.mockImplementation(async (updates) => {
      store = {
        ...store,
        settings: { ...store.settings, ...updates },
      };
    });
    histories.save.mockImplementation(async (nextStore) => {
      store = nextStore;
    });
    projection.GetMessages.mockReturnValue([
      message("m1", "user", "Mara finds the key."),
      message("m2", "assistant", "She enters the lighthouse."),
    ]);
    events.Initialize.mockResolvedValue(undefined);
    api.postStructuredChat.mockResolvedValue({
      updates: [],
      discoveries: [],
    });
    vi.mocked(d.ContinuityHistoriesService).mockReturnValue(
      histories as never,
    );
    vi.mocked(d.LLMChatProjection).mockReturnValue(projection as never);
    vi.mocked(d.ChatEventService).mockReturnValue(events as never);
    vi.mocked(d.OpenRouterChatAPI).mockReturnValue(api as never);
    vi.mocked(d.ErrorService).mockReturnValue(errorService as never);
    service = new ContinuityHistoryMaintenanceService("chat-1");
  });

  it("does not count or call the model while disabled", async () => {
    store.settings.enabled = false;

    await expect(service.onSavedUserTurn()).resolves.toMatchObject({
      status: "disabled",
    });
    expect(histories.updateSettings).not.toHaveBeenCalled();
    expect(api.postStructuredChat).not.toHaveBeenCalled();
  });

  it("increments the saved-turn counter until refresh is due", async () => {
    store.settings.refreshInterval = 3;
    store.settings.messagesSinceLastRefresh = 1;

    await expect(service.onSavedUserTurn()).resolves.toEqual({
      status: "waiting",
      updatedCount: 0,
      discoveredCount: 0,
      messagesUntilRefresh: 1,
    });
    expect(histories.updateSettings).toHaveBeenCalledWith({
      messagesSinceLastRefresh: 2,
    });
    expect(api.postStructuredChat).not.toHaveBeenCalled();
  });

  it("adds validated revisions and discovered Histories when due", async () => {
    store.settings.refreshInterval = 1;
    api.postStructuredChat.mockResolvedValue({
      updates: [
        {
          historyId: "key",
          content: "## Current state\nMara carries the key.",
          routingHints: ["lighthouse", " brass key "],
          sourceMessageIds: ["m1", "invented"],
        },
      ],
      discoveries: [
        {
          title: "The Glass Lighthouse",
          description: "Track changes to the lighthouse.",
          kind: "place",
          content: "## Current state\nMara has entered.",
          routingHints: ["lighthouse"],
          sourceMessageIds: ["m2"],
        },
      ],
    });

    await expect(service.onSavedUserTurn()).resolves.toEqual({
      status: "updated",
      updatedCount: 1,
      discoveredCount: 1,
    });
    expect(store.histories).toHaveLength(2);
    expect(store.histories[0].revisions[1]).toMatchObject({
      content: "## Current state\nMara carries the key.",
      sourceMessageIds: ["m1"],
      coveredThroughMessageId: "m2",
      origin: "llm",
    });
    expect(store.histories[1]).toMatchObject({
      title: "The Glass Lighthouse",
      kind: "place",
      inclusion: "automatic",
    });
  });

  it("sends only the configured recent ordinary messages", async () => {
    store.settings.refreshLookbackMessages = 1;
    projection.GetMessages.mockReturnValue([
      message("m1", "user", "Old"),
      { id: "r1", type: "reasoning", role: "assistant", content: "Private" },
      message("m2", "assistant", "Recent"),
    ]);

    await service.refresh();

    const request = api.postStructuredChat.mock.calls[0][0] as LLMMessage[];
    expect(request.some((item) => item.id === "m1")).toBe(false);
    expect(request.some((item) => item.id === "r1")).toBe(false);
    expect(request.some((item) => item.id === "m2")).toBe(true);
  });

  it("ignores updates for Histories outside a targeted refresh", async () => {
    store.histories.push({
      ...store.histories[0],
      id: "lighthouse",
      title: "The Glass Lighthouse",
      revisions: [
        {
          ...store.histories[0].revisions[0],
          id: "lighthouse-revision-1",
          content: "The lighthouse is dark.",
        },
      ],
    });
    api.postStructuredChat.mockResolvedValue({
      updates: [
        {
          historyId: "lighthouse",
          content: "The lighthouse is now lit.",
          routingHints: ["lighthouse"],
          sourceMessageIds: ["m2"],
        },
      ],
      discoveries: [],
    });

    await service.refresh("key");

    expect(store.histories[1].revisions).toHaveLength(1);
    expect(store.histories[1].revisions[0].content).toBe(
      "The lighthouse is dark.",
    );
  });

  it("rejects revisions that cite no supplied story messages", async () => {
    api.postStructuredChat.mockResolvedValue({
      updates: [
        {
          historyId: "key",
          content: "The key has vanished.",
          routingHints: ["key"],
          sourceMessageIds: ["invented-message"],
        },
      ],
      discoveries: [],
    });

    await expect(service.refresh()).resolves.toMatchObject({
      status: "unchanged",
      updatedCount: 0,
    });
    expect(store.histories[0].revisions).toHaveLength(1);
  });

  it("returns a failure result and preserves the store when the request fails", async () => {
    api.postStructuredChat.mockRejectedValue(new Error("offline"));

    await expect(service.refresh()).resolves.toMatchObject({
      status: "failed",
    });
    expect(histories.save).not.toHaveBeenCalled();
    expect(errorService.log).toHaveBeenCalled();
  });
});

const createStore = (): ContinuityHistoryStore => {
  const store = createDefaultContinuityHistoryStore();
  return {
    ...store,
    settings: {
      ...store.settings,
      enabled: true,
      refreshInterval: 5,
    },
    histories: [
      {
        id: "key",
        title: "The Brass Key",
        description: "Track the key.",
        kind: "object",
        routingHints: ["key"],
        inclusion: "automatic",
        revisions: [
          {
            id: "revision-1",
            content: "The key is missing.",
            sourceMessageIds: ["m1"],
            coveredThroughMessageId: "m1",
            createdAt: "2026-01-01T00:00:00.000Z",
            origin: "llm",
          },
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
};

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
