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

vi.mock("../../../../services/Dependencies");

describe("LLMMessageContextService", () => {
  const testChatId = "test-chat-123";

  let ChatSettingsService: Mocked<ChatSettingsService>;
  let LLMChatProjection: Mocked<LLMChatProjection>;
  let MemoriesService: Mocked<MemoriesService>;
  let SystemPromptsService: Mocked<SystemPromptsService>;

  beforeEach(() => {
    ChatSettingsService = {
      Get: vi.fn().mockResolvedValue(createDefaultChatSettings()),
    } as any;

    LLMChatProjection = {
      GetMessages: vi.fn().mockReturnValue(createMockChatMessages()),
    } as any;

    MemoriesService = {
      get: vi.fn().mockResolvedValue([]),
    } as any;

    SystemPromptsService = {
      Get: vi.fn().mockResolvedValue(DEFAULT_SYSTEM_PROMPTS),
    } as any;

    vi.mocked(d.ChatSettingsService).mockReturnValue(ChatSettingsService);
    vi.mocked(d.LLMChatProjection).mockReturnValue(LLMChatProjection);
    vi.mocked(d.MemoriesService).mockReturnValue(MemoriesService);
    vi.mocked(d.SystemPromptsService).mockReturnValue(SystemPromptsService);
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

  // ---- buildChapterSummaryRequestMessages Tests ----
  describe("buildChapterSummaryRequestMessages", () => {
    it("should include chat messages", async () => {
      const service = new LLMMessageContextService(testChatId);
      const chatMessages = createMockChatMessages();
      LLMChatProjection.GetMessages.mockReturnValue(chatMessages);

      const result = await service.buildChapterSummaryRequestMessages();

      expect(result.slice(0, -1)).toEqual(chatMessages);
    });

    it("should include chapter summary prompt", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildChapterSummaryRequestMessages();

      const lastMessage = result[result.length - 1];
      expect(lastMessage.role).toBe("user");
      expect(lastMessage.content).toContain("generate a brief summary");
    });

    it("should use user-configured chapter summary prompt", async () => {
      const customPrompt = "Custom chapter summary instructions";
      SystemPromptsService.Get.mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        chapterSummaryPrompt: customPrompt,
      });
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildChapterSummaryRequestMessages();

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).toBe(customPrompt);
    });

    it("should fall back to default when system prompts return undefined", async () => {
      SystemPromptsService.Get.mockResolvedValue(undefined);
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildChapterSummaryRequestMessages();

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).toBe(
        DEFAULT_SYSTEM_PROMPTS.chapterSummaryPrompt,
      );
    });
  });

  // ---- buildChapterTitleRequestMessages Tests ----
  describe("buildChapterTitleRequestMessages", () => {
    it("should include chat messages", async () => {
      const service = new LLMMessageContextService(testChatId);
      const chatMessages = createMockChatMessages();
      LLMChatProjection.GetMessages.mockReturnValue(chatMessages);

      const result = await service.buildChapterTitleRequestMessages();

      expect(result.slice(0, -1)).toEqual(chatMessages);
    });

    it("should include chapter title prompt", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildChapterTitleRequestMessages();

      const lastMessage = result[result.length - 1];
      expect(lastMessage.role).toBe("user");
      expect(lastMessage.content).toContain(
        "generate a concise, engaging title",
      );
    });

    it("should use user-configured chapter title prompt", async () => {
      const customPrompt = "Custom chapter title instructions";
      SystemPromptsService.Get.mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        chapterTitlePrompt: customPrompt,
      });
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildChapterTitleRequestMessages();

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).toBe(customPrompt);
    });

    it("should fall back to default when system prompts return undefined", async () => {
      SystemPromptsService.Get.mockResolvedValue(undefined);
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildChapterTitleRequestMessages();

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).toBe(
        DEFAULT_SYSTEM_PROMPTS.chapterTitlePrompt,
      );
    });
  });

  // ---- buildBookSummaryRequestMessages Tests ----
  describe("buildBookSummaryRequestMessages", () => {
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
