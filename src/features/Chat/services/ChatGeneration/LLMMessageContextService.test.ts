import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mocked,
} from "vitest";
import { LLMMessageContextService } from "./LLMMessageContextService";
import type { Memory } from "../../../Memories/services/Memory";
import type { MemoriesService } from "../../../Memories/services/MemoriesService";
import type { ChatSettingsService } from "../Chat/ChatSettingsService";
import type {
  LLMChatProjection,
  LLMMessage,
} from "../../../../services/CQRS/LLMChatProjection";
import { d } from "../../../../services/Dependencies";
import type { ChatSettings } from "../Chat/ChatSettings";
import type { SystemPromptsService } from "../../../Prompts/services/SystemPromptsService";
import { DEFAULT_SYSTEM_PROMPTS } from "../../../Prompts/services/SystemPrompts";
import type { SystemSettingsService } from "../../../SystemSettings/services/SystemSettingsService";
import { DEFAULT_TRAILING_CHAPTER_MESSAGES } from "../../../SystemSettings/services/SystemSettings";
import type { CharacterDescriptionsService } from "../../../Characters/services/CharacterDescriptionsService";

vi.mock("../../../../services/Dependencies");

describe("LLMMessageContextService", () => {
  const testChatId = "test-chat-123";

  let ChatSettingsService: Mocked<ChatSettingsService>;
  let LLMChatProjection: Mocked<LLMChatProjection>;
  let MemoriesService: Mocked<MemoriesService>;
  let SystemPromptsService: Mocked<SystemPromptsService>;
  let SystemSettingsService: Mocked<SystemSettingsService>;
  let CharacterDescriptionsService: Mocked<CharacterDescriptionsService>;

  beforeEach(() => {
    ChatSettingsService = {
      Get: vi.fn().mockResolvedValue(createDefaultChatSettings()),
    } as unknown as Mocked<ChatSettingsService>;

    LLMChatProjection = {
      GetMessages: vi.fn().mockReturnValue(createMockChatMessages()),
      SetPreviousChapterMessageBuffer: vi.fn(),
      SetReasoningRetention: vi.fn(),
    } as unknown as Mocked<LLMChatProjection>;

    MemoriesService = {
      get: vi.fn().mockResolvedValue([]),
    } as unknown as Mocked<MemoriesService>;

    SystemPromptsService = {
      Get: vi.fn().mockResolvedValue(DEFAULT_SYSTEM_PROMPTS),
    } as unknown as Mocked<SystemPromptsService>;

    SystemSettingsService = {
      Get: vi.fn().mockResolvedValue(undefined),
    } as unknown as Mocked<SystemSettingsService>;

    CharacterDescriptionsService = {
      get: vi.fn().mockResolvedValue([]),
    } as unknown as Mocked<CharacterDescriptionsService>;

    vi.mocked(d.ChatSettingsService).mockReturnValue(ChatSettingsService);
    vi.mocked(d.LLMChatProjection).mockReturnValue(LLMChatProjection);
    vi.mocked(d.MemoriesService).mockReturnValue(MemoriesService);
    vi.mocked(d.SystemPromptsService).mockReturnValue(SystemPromptsService);
    vi.mocked(d.SystemSettingsService).mockReturnValue(SystemSettingsService);
    vi.mocked(d.CharacterDescriptionsService).mockReturnValue(
      CharacterDescriptionsService,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---- buildMemoryMessages Tests ----
  describe("buildMemoryMessages", () => {
    it("should return empty array when no memories provided", () => {
      const service = new LLMMessageContextService(testChatId);

      const result = service.buildMemoryMessages([]);

      expect(result).toEqual([]);
    });

    it("should combine memories into single system message", () => {
      const service = new LLMMessageContextService(testChatId);
      const memories = createMockMemories();

      const result = service.buildMemoryMessages(memories);

      expect(result).toHaveLength(1);
      expectSystemMessage(
        result[0],
        "# Memories\r\nMemory content 1\r\nMemory content 2",
      );
    });

    it("should filter out empty memory content", () => {
      const service = new LLMMessageContextService(testChatId);
      const memories = createMemoriesWithEmptyContent();

      const result = service.buildMemoryMessages(memories);

      expect(result).toHaveLength(1);
      expectSystemMessage(result[0], "# Memories\r\nValid content");
    });

    it("should return empty array when all memories have empty content", () => {
      const service = new LLMMessageContextService(testChatId);
      const memories = createAllEmptyMemories();

      const result = service.buildMemoryMessages(memories);

      expect(result).toEqual([]);
    });
  });

  // ---- buildGenerationRequestMessages Tests ----
  describe("buildGenerationRequestMessages", () => {
    it("floats character sheets before the configured trailing chat messages", async () => {
      ChatSettingsService.Get.mockResolvedValue({
        ...createDefaultChatSettings(),
        characterSheetsTrailingMessageCount: 2,
      });
      LLMChatProjection.GetMessages.mockReturnValue([
        { id: "msg-1", type: "message", role: "user", content: "One" },
        { id: "msg-2", type: "message", role: "assistant", content: "Two" },
        { id: "msg-3", type: "message", role: "user", content: "Three" },
        { id: "msg-4", type: "message", role: "assistant", content: "Four" },
      ]);
      CharacterDescriptionsService.get.mockResolvedValue([
        {
          id: "character-1",
          name: "Mara",
          appearance: "dark curls",
          sheetItems: ["A determined navigator."],
          detectedActive: true,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ]);

      const result = await new LLMMessageContextService(
        testChatId,
      ).buildGenerationRequestMessages();

      expect(result[0].id).toBe("msg-1");
      expect(result[1].id).toBe("msg-2");
      expect(result[2].content).toContain("# Character Sheets");
      expect(result[3].id).toBe("msg-3");
      expect(result[4].id).toBe("msg-4");
      expect(result[5].content).toBe("Test prompt");
    });

    it("includes only effectively active sheets and formats explicit bullets", async () => {
      CharacterDescriptionsService.get.mockResolvedValue([
        {
          id: "active",
          name: "Mara",
          appearance: "must not enter text context",
          sheetItems: ["Navigator", "Carries the brass key"],
          detectedActive: true,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
        {
          id: "inactive",
          name: "Ivo",
          appearance: "",
          sheetItems: ["Left the city"],
          detectedActive: false,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
        {
          id: "overridden",
          name: "Nell",
          appearance: "",
          sheetItems: ["Watching from the ridge"],
          detectedActive: false,
          activeOverride: true,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ]);

      const result = await new LLMMessageContextService(
        testChatId,
      ).buildGenerationRequestMessages();
      const sheetMessage = result.find((message) =>
        message.content.includes("# Character Sheets"),
      );

      expect(sheetMessage?.content).toContain("## Mara");
      expect(sheetMessage?.content).toContain("- Navigator");
      expect(sheetMessage?.content).toContain("- Carries the brass key");
      expect(sheetMessage?.content).toContain("## Nell");
      expect(sheetMessage?.content).not.toContain("## Ivo");
      expect(sheetMessage?.content).not.toContain(
        "must not enter text context",
      );
    });

    it("should fetch chat settings for the correct chatId", async () => {
      const service = new LLMMessageContextService(testChatId);

      await service.buildGenerationRequestMessages();

      expect(d.ChatSettingsService).toHaveBeenCalledWith(testChatId);
    });

    it("should get chat messages from LLMChatProjection", async () => {
      const service = new LLMMessageContextService(testChatId);

      await service.buildGenerationRequestMessages();

      expect(d.LLMChatProjection).toHaveBeenCalledWith(testChatId);
      expect(LLMChatProjection.GetMessages).toHaveBeenCalled();
    });

    it("should apply system trailing chapter message setting before reading chat messages", async () => {
      SystemSettingsService.Get.mockResolvedValue({
        chapterCompressionSettings: {
          trailingChapterMessages: 3,
        },
      });
      const service = new LLMMessageContextService(testChatId);

      await service.buildGenerationRequestMessages();

      expect(
        LLMChatProjection.SetPreviousChapterMessageBuffer,
      ).toHaveBeenCalledWith(3);
    });

    it("should default trailing chapter message setting when system setting is unset", async () => {
      const service = new LLMMessageContextService(testChatId);

      await service.buildGenerationRequestMessages();

      expect(
        LLMChatProjection.SetPreviousChapterMessageBuffer,
      ).toHaveBeenCalledWith(DEFAULT_TRAILING_CHAPTER_MESSAGES);
    });

    it("should fetch memories", async () => {
      const service = new LLMMessageContextService(testChatId);

      await service.buildGenerationRequestMessages();

      expect(d.MemoriesService).toHaveBeenCalledWith(testChatId);
      expect(MemoriesService.get).toHaveBeenCalled();
    });

    it("should include story prompt by default", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildGenerationRequestMessages();

      const lastMessage = result[result.length - 1];
      expect(lastMessage.role).toBe("system");
      expect(lastMessage.content).toBe("Test prompt");
    });

    it("should exclude story prompt when includeStoryPrompt is false", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildGenerationRequestMessages(false);

      const hasStoryPrompt = result.some((m) => m.content === "Test prompt");
      expect(hasStoryPrompt).toBe(false);
    });

    it("should build messages in correct order", async () => {
      const service = new LLMMessageContextService(testChatId);
      MemoriesService.get.mockResolvedValue(createMockMemories());

      const result = await service.buildGenerationRequestMessages();

      expectMessagesContainChatMessages(result);
      expectMessagesContainMemories(result);
      expectStoryPromptIsLast(result);
    });

    it("should append guidance message when guidance is provided", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildGenerationRequestMessages(
        true,
        "Write a dramatic scene",
      );

      const lastMessage = result[result.length - 1];
      expect(lastMessage.role).toBe("user");
      expect(lastMessage.content).toContain("Write a dramatic scene");
    });

    it("should not append guidance message when guidance is undefined", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildGenerationRequestMessages(true);

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).toBe("Test prompt");
    });

    it("should not append guidance message when guidance is empty", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildGenerationRequestMessages(true, "   ");

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).toBe("Test prompt");
    });

    it("should place guidance message after story prompt", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildGenerationRequestMessages(
        true,
        "Be concise",
      );

      const storyPromptIndex = result.findIndex(
        (m) => m.content === "Test prompt",
      );
      const guidanceIndex = result.findIndex((m) =>
        m.content.includes("Be concise"),
      );
      expect(guidanceIndex).toBeGreaterThan(storyPromptIndex);
    });
  });

  describe("buildReasoningRequestMessages", () => {
    it("should consolidate chat history and use system reasoning prompt by default", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildReasoningRequestMessages();

      expect(result).toHaveLength(1);
      const [message] = result;
      expect(message.role).toBe("system");
      expect(message.content).toContain("Chat History:");
      expect(message.content).toContain("Reasoning Instructions:");
      expect(message.content).toContain(DEFAULT_SYSTEM_PROMPTS.reasoningPrompt);
    });

    it("should use a chat-specific reasoning prompt override when configured", async () => {
      ChatSettingsService.Get.mockResolvedValue({
        ...createDefaultChatSettings(),
        reasoningPromptOverride: "Custom chat reasoning prompt",
      });
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildReasoningRequestMessages();

      expect(result[0].content).toContain("Custom chat reasoning prompt");
    });

    it("should append guidance after the consolidated reasoning context", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildReasoningRequestMessages("Go darker");

      const lastMessage = result[result.length - 1];
      expect(lastMessage.role).toBe("user");
      expect(lastMessage.content).toContain("Go darker");
      expect(result[result.length - 2].content).toContain(
        DEFAULT_SYSTEM_PROMPTS.reasoningPrompt,
      );
    });

    it("should send chat context as an array when consolidation is disabled", async () => {
      ChatSettingsService.Get.mockResolvedValue({
        ...createDefaultChatSettings(),
        reasoningConsolidateMessageHistory: false,
      });
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildReasoningRequestMessages();

      expect(result.length).toBeGreaterThan(1);
      const lastMessage = result[result.length - 1];
      expect(lastMessage.role).toBe("system");
      expect(lastMessage.content).toBe(DEFAULT_SYSTEM_PROMPTS.reasoningPrompt);
    });
  });

  describe("reasoning retention configuration", () => {
    it("sets reasoning retention to 0 when reasoningEnabled is false", async () => {
      ChatSettingsService.Get.mockResolvedValue({
        ...createDefaultChatSettings(),
        reasoningEnabled: false,
      });
      const service = new LLMMessageContextService(testChatId);

      await service.buildGenerationRequestMessages(false);

      expect(LLMChatProjection.SetReasoningRetention).toHaveBeenCalledWith(0);
    });

    it("sets reasoning retention to configured value", async () => {
      ChatSettingsService.Get.mockResolvedValue({
        ...createDefaultChatSettings(),
        reasoningExpiresAfterMessages: 2,
      });
      const service = new LLMMessageContextService(testChatId);

      await service.buildGenerationRequestMessages(false);

      expect(LLMChatProjection.SetReasoningRetention).toHaveBeenCalledWith(2);
    });

    it("sets reasoning retention to null when expiration is disabled", async () => {
      ChatSettingsService.Get.mockResolvedValue({
        ...createDefaultChatSettings(),
        reasoningExpiresAfterMessages: null,
      });
      const service = new LLMMessageContextService(testChatId);

      await service.buildGenerationRequestMessages(false);

      expect(LLMChatProjection.SetReasoningRetention).toHaveBeenCalledWith(
        null,
      );
    });

    it("uses default retention when no override configured", async () => {
      const service = new LLMMessageContextService(testChatId);

      await service.buildGenerationRequestMessages(false);

      expect(LLMChatProjection.SetReasoningRetention).toHaveBeenCalledWith(4);
    });
  });

  // ---- buildRegenerationRequestMessages Tests ----
  describe("buildRegenerationRequestMessages", () => {
    it("should include feedback message when feedback is provided", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildRegenerationRequestMessages(
        "msg-2",
        "Original content",
        "Make it shorter",
      );

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).toContain("Original content");
      expect(lastMessage.content).toContain("Make it shorter");
    });

    it("should not include feedback message when feedback is undefined", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildRegenerationRequestMessages(
        "msg-2",
        "Original content",
      );

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).not.toContain("Original content");
    });

    it("should not include feedback message when feedback is empty", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildRegenerationRequestMessages(
        "msg-2",
        "Original content",
        "   ",
      );

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).not.toContain("Please regenerate");
    });

    it("should not include story prompt", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildRegenerationRequestMessages(
        "msg-2",
        "Original",
        "Feedback",
      );

      const hasStoryPrompt = result.some((m) => m.content === "Test prompt");
      expect(hasStoryPrompt).toBe(false);
    });

    it("should only include messages before the regenerated message", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildRegenerationRequestMessages(
        "msg-2",
        "Original content",
        "Feedback",
      );

      const chatMessageIds = result.filter((m) => m.id).map((m) => m.id);

      expect(chatMessageIds).toContain("msg-1");
      expect(chatMessageIds).not.toContain("msg-2");
    });
  });

  describe("buildChapterDraftRequestMessages", () => {
    it("includes character sheets in chapter context", async () => {
      CharacterDescriptionsService.get.mockResolvedValue([
        {
          id: "character-1",
          name: "Mara",
          appearance: "dark curls",
          sheetItems: ["A determined navigator."],
          detectedActive: true,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ]);
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildChapterDraftRequestMessages(
        createMockChatMessages(),
      );

      expect(
        result.some((message) =>
          message.content.includes("# Character Sheets"),
        ),
      ).toBe(true);
    });

    it("uses the captured chat snapshot", async () => {
      const service = new LLMMessageContextService(testChatId);
      const snapshot = createMockChatMessages();

      const result = await service.buildChapterDraftRequestMessages(snapshot);

      expect(result.slice(0, -1)).toEqual(snapshot);
      expect(LLMChatProjection.GetMessages).not.toHaveBeenCalled();
    });

    it("requests a structured title and summary together", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildChapterDraftRequestMessages(
        createMockChatMessages(),
      );

      const lastMessage = result[result.length - 1];
      expect(lastMessage.role).toBe("user");
      expect(lastMessage.content).toContain("generate a brief summary");
      expect(lastMessage.content).toContain(
        "generate a concise, engaging title",
      );
      expect(lastMessage.content).toContain(
        "exactly two string fields: title and summary",
      );
    });

    it("uses both configured chapter prompts", async () => {
      SystemPromptsService.Get.mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        chapterSummaryPrompt: "Custom summary instructions",
        chapterTitlePrompt: "Custom title instructions",
      });
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildChapterDraftRequestMessages(
        createMockChatMessages(),
      );

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).toContain("Custom summary instructions");
      expect(lastMessage.content).toContain("Custom title instructions");
    });

    it("loads shared chapter context and prompts once", async () => {
      const service = new LLMMessageContextService(testChatId);

      await service.buildChapterDraftRequestMessages(createMockChatMessages());

      expect(MemoriesService.get).toHaveBeenCalledOnce();
      expect(CharacterDescriptionsService.get).toHaveBeenCalledOnce();
      expect(SystemPromptsService.Get).toHaveBeenCalledOnce();
      expect(ChatSettingsService.Get).toHaveBeenCalledOnce();
    });

    it("falls back to both default prompts", async () => {
      SystemPromptsService.Get.mockResolvedValue(undefined);
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildChapterDraftRequestMessages(
        createMockChatMessages(),
      );

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).toContain(
        DEFAULT_SYSTEM_PROMPTS.chapterSummaryPrompt,
      );
      expect(lastMessage.content).toContain(
        DEFAULT_SYSTEM_PROMPTS.chapterTitlePrompt,
      );
    });
  });

  // ---- buildBookSummaryRequestMessages Tests ----
  describe("buildBookSummaryRequestMessages", () => {
    it("includes character sheets before book summaries", async () => {
      CharacterDescriptionsService.get.mockResolvedValue([
        {
          id: "character-1",
          name: "Mara",
          appearance: "dark curls",
          sheetItems: ["A determined navigator."],
          detectedActive: true,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ]);
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildBookSummaryRequestMessages([
        "Summary 1",
      ]);

      expect(result[0].content).toContain("# Character Sheets");
      expect(result[1].content).toContain("Chapter 1:");
    });

    it("should include chapter summaries as system message", async () => {
      const service = new LLMMessageContextService(testChatId);
      const summaries = ["Chapter 1 summary", "Chapter 2 summary"];

      const result = await service.buildBookSummaryRequestMessages(summaries);

      // Should have summaries message + prompt message
      expect(result).toHaveLength(2);
      expect(result[0].content).toContain("Chapter 1:");
      expect(result[0].content).toContain("Chapter 1 summary");
      expect(result[0].content).toContain("Chapter 2:");
      expect(result[0].content).toContain("Chapter 2 summary");
    });

    it("should include default book summary prompt as last message", async () => {
      SystemPromptsService.Get.mockResolvedValue(undefined);
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildBookSummaryRequestMessages([
        "Summary 1",
      ]);

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).toBe(
        DEFAULT_SYSTEM_PROMPTS.bookSummaryPrompt,
      );
    });

    it("should use user-configured book summary prompt", async () => {
      const customPrompt = "Custom book summary instructions";
      SystemPromptsService.Get.mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        bookSummaryPrompt: customPrompt,
      });
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildBookSummaryRequestMessages([
        "Summary 1",
      ]);

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).toBe(customPrompt);
    });
  });

  // ---- buildBookTitleRequestMessages Tests ----
  describe("buildBookTitleRequestMessages", () => {
    it("should include chapter summaries as system message", async () => {
      const service = new LLMMessageContextService(testChatId);
      const summaries = ["Chapter 1 summary", "Chapter 2 summary"];

      const result = await service.buildBookTitleRequestMessages(summaries);

      expect(result).toHaveLength(2);
      expect(result[0].content).toContain("Chapter 1:");
      expect(result[0].content).toContain("Chapter 2:");
    });

    it("should include default book title prompt as last message", async () => {
      SystemPromptsService.Get.mockResolvedValue(undefined);
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildBookTitleRequestMessages(["Summary 1"]);

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).toBe(DEFAULT_SYSTEM_PROMPTS.bookTitlePrompt);
    });

    it("should use user-configured book title prompt", async () => {
      const customPrompt = "Custom book title instructions";
      SystemPromptsService.Get.mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        bookTitlePrompt: customPrompt,
      });
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildBookTitleRequestMessages(["Summary 1"]);

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).toBe(customPrompt);
    });
  });

  // ---- Helper Functions ----
  function createDefaultChatSettings(): ChatSettings {
    return {
      timestampCreatedUtcMs: Date.now(),
      chatTitle: "Test Chat",
      prompt: "Test prompt",
    };
  }

  function createMockChatMessages(): LLMMessage[] {
    return [
      { id: "msg-1", role: "user", content: "Hello" },
      { id: "msg-2", role: "assistant", content: "Hi there!" },
    ];
  }

  function createMockMemories(): Memory[] {
    return [
      { id: "mem-1", content: "Memory content 1" },
      { id: "mem-2", content: "Memory content 2" },
    ];
  }

  function createMemoriesWithEmptyContent(): Memory[] {
    return [
      { id: "mem-1", content: "" },
      { id: "mem-2", content: "Valid content" },
      { id: "mem-3", content: "   " },
    ];
  }

  function createAllEmptyMemories(): Memory[] {
    return [
      { id: "mem-1", content: "" },
      { id: "mem-2", content: "   " },
    ];
  }

  function expectSystemMessage(
    message: LLMMessage,
    expectedContent: string,
  ): void {
    expect(message.role).toBe("system");
    expect(message.content).toBe(expectedContent);
  }

  function expectStoryPromptIsLast(messages: LLMMessage[]): void {
    const lastMessage = messages[messages.length - 1];
    expect(lastMessage.role).toBe("system");
    expect(lastMessage.content).toBe("Test prompt");
  }

  function expectMessagesContainChatMessages(messages: LLMMessage[]): void {
    const userMessage = messages.find((m) => m.content === "Hello");
    const assistantMessage = messages.find((m) => m.content === "Hi there!");
    expect(userMessage).toBeDefined();
    expect(assistantMessage).toBeDefined();
  }

  function expectMessagesContainMemories(messages: LLMMessage[]): void {
    const memoryMessage = messages.find((m) =>
      m.content.includes("# Memories"),
    );
    expect(memoryMessage).toBeDefined();
  }
});
