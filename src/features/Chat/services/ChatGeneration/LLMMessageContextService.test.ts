import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  LLMChatProjection,
  LLMContextProjectionPolicy,
  LLMMessage,
} from "../../../../services/CQRS/LLMChatProjection";
import { d } from "../../../../services/Dependencies";
import type { CharacterDescriptionsService } from "../../../Characters/services/CharacterDescriptionsService";
import type { MemoriesService } from "../../../Memories/services/MemoriesService";
import type { SystemSettingsService } from "../../../SystemSettings/services/SystemSettingsService";
import type { ChatSettings } from "../Chat/ChatSettings";
import type { ChatSettingsService } from "../Chat/ChatSettingsService";
import { LLMMessageContextService } from "./LLMMessageContextService";

vi.mock("../../../../services/Dependencies");

const CHAT_ID = "chat-1";
const getContext = vi.fn();
const HISTORY = Array.from({ length: 15 }, (_, index): LLMMessage => ({
  id: `message-${index + 1}`,
  type: "message",
  role: index % 2 === 0 ? "user" : "assistant",
  content: `Message ${index + 1}`,
}));

describe("LLMMessageContextService", () => {
  const getChatSettings = vi.fn();
  const getSystemSettings = vi.fn();
  const getMemories = vi.fn();
  const getCharacters = vi.fn();
  const buildContinuityContext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getContext.mockReturnValue({ messages: HISTORY, trace: [] });
    getChatSettings.mockResolvedValue(defaultChatSettings());
    getSystemSettings.mockResolvedValue(undefined);
    getMemories.mockResolvedValue([]);
    getCharacters.mockResolvedValue([]);
    buildContinuityContext.mockResolvedValue({
      messages: [],
      selections: [],
      trailingMessageCount: 0,
    });

    vi.mocked(d.LLMChatProjection).mockReturnValue({
      GetContext: getContext,
    } as unknown as LLMChatProjection);
    vi.mocked(d.ChatSettingsService).mockReturnValue({
      Get: getChatSettings,
    } as unknown as ChatSettingsService);
    vi.mocked(d.SystemSettingsService).mockReturnValue({
      Get: getSystemSettings,
    } as unknown as SystemSettingsService);
    vi.mocked(d.MemoriesService).mockReturnValue({
      get: getMemories,
    } as unknown as MemoriesService);
    vi.mocked(d.CharacterDescriptionsService).mockReturnValue({
      get: getCharacters,
    } as unknown as CharacterDescriptionsService);
    vi.mocked(d.ContinuityHistoryContextService).mockReturnValue({
      buildContext: buildContinuityContext,
    } as never);
  });

  it("returns no context and fetches nothing for an empty selection", async () => {
    const result = await createService().buildContext();

    expect(result).toEqual([]);
    expect(getContext).not.toHaveBeenCalled();
    expect(getChatSettings).not.toHaveBeenCalled();
    expect(getSystemSettings).not.toHaveBeenCalled();
    expect(getMemories).not.toHaveBeenCalled();
    expect(getCharacters).not.toHaveBeenCalled();
    expect(buildContinuityContext).not.toHaveBeenCalled();
  });

  it("uses configured projection policy for history and excludes Plans by default", async () => {
    getSystemSettings.mockResolvedValue({
      chapterCompressionSettings: { trailingChapterMessages: 4 },
      messageCompressionSettings: { enabled: true, afterMessages: 9 },
    });
    getChatSettings.mockResolvedValue({
      ...defaultChatSettings(),
      reasoningExpiresAfterMessages: 7,
    });

    await createService().buildContext({ history: true });

    expectProjectionPolicy({
      trailingChapterMessages: 4,
      reasoningRetentionMessages: 7,
      messageCompressionAfterMessages: 9,
      planSelection: { mode: "exclude-all" },
    });
  });

  it("includes Plans only when selected", async () => {
    await createService().buildContext({ history: true, plans: true });

    expectProjectionPolicy({
      planSelection: { mode: "include" },
    });
  });

  it.each([
    {
      settings: { reasoningEnabled: false },
      expectedRetention: 0,
    },
    {
      settings: { reasoningExpiresAfterMessages: null },
      expectedRetention: null,
    },
    {
      settings: {},
      expectedRetention: 5,
    },
  ])(
    "resolves reasoning retention from chat settings",
    async ({ settings, expectedRetention }) => {
      getChatSettings.mockResolvedValue({
        ...defaultChatSettings(),
        ...settings,
      });

      await createService().buildContext({ history: true });

      expectProjectionPolicy({
        reasoningRetentionMessages: expectedRetention,
      });
    },
  );

  it("can disable configured message compression for a frozen snapshot", async () => {
    getSystemSettings.mockResolvedValue({
      messageCompressionSettings: { enabled: true, afterMessages: 8 },
    });

    await createService().buildContext(
      { history: true },
      { disableMessageCompression: true },
    );

    expectProjectionPolicy({ messageCompressionAfterMessages: null });
  });

  it("uses a history override without reading the projection", async () => {
    const override = [message("one"), message("two")];

    const result = await createService().buildContext(
      { history: true },
      { historyOverride: override },
    );

    expect(result).toEqual(override);
    expect(result).not.toBe(override);
    expect(getContext).not.toHaveBeenCalled();
  });

  it("still excludes Plans from an override unless explicitly selected", async () => {
    const override = [message("story", "story"), message("plan", "plan")];

    const withoutPlans = await createService().buildContext(
      { history: true },
      { historyOverride: override },
    );
    const withPlans = await createService().buildContext(
      { history: true, plans: true },
      { historyOverride: override },
    );

    expect(withoutPlans).toEqual([message("story", "story")]);
    expect(withPlans).toEqual(override);
  });

  it("truncates history before a regeneration target", async () => {
    getContext.mockReturnValue({
      messages: HISTORY,
      trace: HISTORY.map((entry) => ({
        id: entry.id!,
        type: "message",
        included: true,
        buffered: false,
      })),
    });

    const result = await createService().buildContextWithTrace(
      { history: true },
      { beforeMessageId: "message-4" },
    );

    expect(result.messages.map((entry) => entry.id)).toEqual([
      "message-1",
      "message-2",
      "message-3",
    ]);
    expect(result.trace.projection.slice(3)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "message-4",
          included: false,
          exclusionReason: "regeneration-truncated",
        }),
        expect.objectContaining({
          id: "message-15",
          included: false,
          exclusionReason: "regeneration-truncated",
        }),
      ]),
    );
  });

  it("keeps the last 12 persisted history messages when requested", async () => {
    getContext.mockReturnValue({
      messages: [
        { role: "system", content: "Transient" },
        ...HISTORY,
      ],
      trace: [],
    });

    const result = await createService().buildContext({
      history: true,
      recentHistoryOnly: true,
    });

    expect(result).toHaveLength(12);
    expect(result[0].id).toBe("message-4");
    expect(result[11].id).toBe("message-15");
  });

  it("can select only visible Plan messages", async () => {
    getContext.mockReturnValue({
      messages: [
        message("story", "story"),
        message("plan", "plan"),
      ],
      trace: [],
    });

    const result = await createService().buildContext({ plans: true });

    expect(result).toEqual([message("plan", "plan")]);
  });

  it("fetches and formats only selected Memories", async () => {
    getMemories.mockResolvedValue([
      { content: "First memory" },
      { content: " " },
      { content: "Second memory" },
    ]);

    const result = await createService().buildContext({ memories: true });

    expect(result).toEqual([
      expect.objectContaining({
        role: "system",
        content: "# Memories\r\nFirst memory\r\nSecond memory",
      }),
    ]);
    expect(getMemories).toHaveBeenCalledOnce();
    expect(getCharacters).not.toHaveBeenCalled();
    expect(getContext).not.toHaveBeenCalled();
  });

  it("fetches and formats only tracked active Character Sheets", async () => {
    getCharacters.mockResolvedValue([
      character("active", true, true, ["Keeps a brass compass."]),
      character("inactive", true, false, ["Should be omitted."]),
      character("untracked", false, true, ["Should be omitted."]),
    ]);

    const result = await createService().buildContext({
      characterSheets: true,
    });

    expect(result).toEqual([
      expect.objectContaining({
        role: "system",
        content:
          "# Character Sheets\r\n## active\n- Keeps a brass compass.",
      }),
    ]);
    expect(getCharacters).toHaveBeenCalledOnce();
    expect(getMemories).not.toHaveBeenCalled();
  });

  it("inserts selected durable sources before the configured recent history", async () => {
    getChatSettings.mockResolvedValue({
      ...defaultChatSettings(),
      characterSheetsTrailingMessageCount: 2,
    });
    getMemories.mockResolvedValue([{ content: "Remember this." }]);
    getCharacters.mockResolvedValue([
      character("Mara", true, true, ["Navigator"]),
    ]);

    const result = await createService().buildContext({
      history: true,
      memories: true,
      characterSheets: true,
    });

    expect(result.slice(-4).map((entry) => entry.content)).toEqual([
      "# Memories\r\nRemember this.",
      "# Character Sheets\r\n## Mara\n- Navigator",
      "Message 14",
      "Message 15",
    ]);
  });

  it("selects and traces Continuity Histories only when requested", async () => {
    buildContinuityContext.mockResolvedValue({
      messages: [{ role: "system", content: "# Continuity History" }],
      selections: [{ historyId: "history-1", revisionId: "revision-1" }],
      trailingMessageCount: 1,
    });

    const result = await createService().buildContextWithTrace({
      history: true,
      continuityHistories: true,
    });

    expect(buildContinuityContext).toHaveBeenCalledWith(HISTORY, undefined);
    expect(result.messages[result.messages.length - 2]?.content).toBe(
      "# Continuity History",
    );
    expect(
      result.trace.sections.find(
        (section) => section.source === "continuity-histories",
      )?.itemIds,
    ).toEqual(["history-1"]);
  });

  it("can select Continuity Histories without including chat history", async () => {
    buildContinuityContext.mockResolvedValue({
      messages: [{ role: "system", content: "# Continuity History" }],
      selections: [{ historyId: "history-1", revisionId: "revision-1" }],
      trailingMessageCount: 1,
    });

    const result = await createService().buildContext({
      continuityHistories: true,
    });

    expect(buildContinuityContext).toHaveBeenCalledWith(HISTORY, undefined);
    expect(result).toEqual([
      expect.objectContaining({
        role: "system",
        content: "# Continuity History",
      }),
    ]);
  });

  it("does not fetch unselected durable sources", async () => {
    await createService().buildContext({ history: true });

    expect(getMemories).not.toHaveBeenCalled();
    expect(getCharacters).not.toHaveBeenCalled();
    expect(buildContinuityContext).not.toHaveBeenCalled();
  });
});

const createService = (): LLMMessageContextService =>
  new LLMMessageContextService(CHAT_ID);

const expectProjectionPolicy = (
  expected: Partial<LLMContextProjectionPolicy>,
): void => {
  expect(getLastProjectionPolicy()).toEqual(expect.objectContaining(expected));
};

const getLastProjectionPolicy = (): LLMContextProjectionPolicy =>
  getContext.mock.calls[getContext.mock.calls.length - 1]?.[0] as LLMContextProjectionPolicy;

const defaultChatSettings = (): ChatSettings =>
  ({
    prompt: "Continue",
    reasoningEnabled: true,
    reasoningExpiresAfterMessages: 5,
    characterSheetsTrailingMessageCount: 5,
  }) as ChatSettings;

const message = (content: string, type = "message"): LLMMessage => ({
  id: content,
  type,
  role: "system",
  content,
});

const character = (
  name: string,
  tracked: boolean,
  active: boolean,
  sheetItems: string[],
) =>
  ({
    id: name,
    name,
    isTracked: tracked,
    detectedActive: active,
    sheetItems,
    appearance: "",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  }) as never;
