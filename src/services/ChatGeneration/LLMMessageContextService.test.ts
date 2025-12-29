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
import { d } from "../Dependencies";
import type { Memory } from "./Memory";
import { FirstPersonCharacterPrompt } from "../Chat/templates/FirstPersonCharacterTemplate";
import type { LLMChatProjection, LLMMessage } from "../CQRS/LLMChatProjection";
import { ChatSettingsUtils, type ChatSettings } from "../Chat/ChatSettings";
import type { Plan } from "./Plan";
import type { MemoriesService } from "./MemoriesService";
import type { PlanService } from "./PlanService";
import type { ChatSettingsService } from "../Chat/ChatSettingsService";

vi.mock("../Dependencies");

describe("LLMMessageContextService", () => {
  const testChatId = "test-chat-123";

  let ChatSettingsService: Mocked<ChatSettingsService>;
  let LLMChatProjection: Mocked<LLMChatProjection>;
  let PlanService: Mocked<PlanService>;
  let MemoriesService: Mocked<MemoriesService>;

  beforeEach(() => {
    ChatSettingsService = {
      Get: vi.fn().mockResolvedValue(createDefaultChatSettings()),
    } as any;

    LLMChatProjection = {
      GetMessages: vi.fn().mockReturnValue(createMockChatMessages()),
    } as any;

    PlanService = {
      generateUpdatedPlans: vi.fn().mockResolvedValue(undefined),
      GetPlans: vi.fn().mockReturnValue([]),
    } as any;

    MemoriesService = {
      Get: vi.fn().mockResolvedValue([]),
    } as any;

    vi.mocked(d.ChatSettingsService).mockReturnValue(ChatSettingsService);
    vi.mocked(d.LLMChatProjection).mockReturnValue(LLMChatProjection);
    vi.mocked(d.PlanService).mockReturnValue(PlanService);
    vi.mocked(d.MemoriesService).mockReturnValue(MemoriesService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---- ChatSettingsUtils.getStoryPrompt Tests ----
  describe("ChatSettingsUtils.getStoryPrompt", () => {
    it("should return custom prompt when promptType is Manual", () => {
      const chatSettings =
        createChatSettingsWithCustomPrompt("My custom prompt");

      const result = ChatSettingsUtils.getStoryPrompt(chatSettings);

      expect(result).toBe("My custom prompt");
    });

    it("should return FirstPersonCharacterPrompt when promptType is not Manual", () => {
      const chatSettings = createDefaultChatSettings();

      const result = ChatSettingsUtils.getStoryPrompt(chatSettings);

      expect(result).toBe(FirstPersonCharacterPrompt);
    });

    it("should return FirstPersonCharacterPrompt when customPrompt is empty", () => {
      const chatSettings = createChatSettingsWithEmptyCustomPrompt();

      const result = ChatSettingsUtils.getStoryPrompt(chatSettings);

      expect(result).toBe(FirstPersonCharacterPrompt);
    });
  });

  // ---- buildPlanMessages Tests ----
  describe("buildPlanMessages", () => {
    it("should return empty array when no plans provided", () => {
      const service = new LLMMessageContextService(testChatId);

      const result = service.buildPlanMessages([]);

      expect(result).toEqual([]);
    });

    it("should create system message for each plan", () => {
      const service = new LLMMessageContextService(testChatId);
      const plans = createMockPlans();

      const result = service.buildPlanMessages(plans);

      expect(result).toHaveLength(2);
      expectSystemMessage(result[0], "Plan 1\nContent 1");
      expectSystemMessage(result[1], "Plan 2\nContent 2");
    });

    it("should handle plans with undefined content", () => {
      const service = new LLMMessageContextService(testChatId);
      const plans = [createPlanWithUndefinedContent()];

      const result = service.buildPlanMessages(plans);

      expect(result).toHaveLength(1);
      expectSystemMessage(result[0], "Empty Plan\n");
    });
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
        "# Memories\r\nMemory content 1\r\nMemory content 2"
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

    it("should generate updated plans", async () => {
      const service = new LLMMessageContextService(testChatId);
      const chatMessages = createMockChatMessages();
      LLMChatProjection.GetMessages.mockReturnValue(chatMessages);

      await service.buildGenerationRequestMessages();

      expect(PlanService.generateUpdatedPlans).toHaveBeenCalledWith(
        chatMessages
      );
    });

    it("should fetch memories", async () => {
      const service = new LLMMessageContextService(testChatId);

      await service.buildGenerationRequestMessages();

      expect(d.MemoriesService).toHaveBeenCalledWith(testChatId);
      expect(MemoriesService.Get).toHaveBeenCalled();
    });

    it("should include story prompt by default", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildGenerationRequestMessages();

      const lastMessage = result[result.length - 1];
      expect(lastMessage.role).toBe("system");
      expect(lastMessage.content).toBe(FirstPersonCharacterPrompt);
    });

    it("should exclude story prompt when includeStoryPrompt is false", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildGenerationRequestMessages(false);

      const hasStoryPrompt = result.some(
        (m) => m.content === FirstPersonCharacterPrompt
      );
      expect(hasStoryPrompt).toBe(false);
    });

    it("should build messages in correct order", async () => {
      const service = new LLMMessageContextService(testChatId);
      PlanService.GetPlans.mockReturnValue(createMockPlans());
      MemoriesService.Get.mockResolvedValue(createMockMemories());

      const result = await service.buildGenerationRequestMessages();

      expectMessagesContainChatMessages(result);
      expectMessagesContainPlans(result);
      expectMessagesContainMemories(result);
      expectStoryPromptIsLast(result);
    });
  });

  // ---- buildRegenerationRequestMessages Tests ----
  describe("buildRegenerationRequestMessages", () => {
    it("should include feedback message when feedback is provided", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildRegenerationRequestMessages(
        "Original content",
        "Make it shorter"
      );

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).toContain("Original content");
      expect(lastMessage.content).toContain("Make it shorter");
    });

    it("should not include feedback message when feedback is undefined", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildRegenerationRequestMessages(
        "Original content"
      );

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).not.toContain("Original content");
    });

    it("should not include feedback message when feedback is empty", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildRegenerationRequestMessages(
        "Original content",
        "   "
      );

      const lastMessage = result[result.length - 1];
      expect(lastMessage.content).not.toContain("Please regenerate");
    });

    it("should not include story prompt", async () => {
      const service = new LLMMessageContextService(testChatId);

      const result = await service.buildRegenerationRequestMessages(
        "Original",
        "Feedback"
      );

      const hasStoryPrompt = result.some(
        (m) => m.content === FirstPersonCharacterPrompt
      );
      expect(hasStoryPrompt).toBe(false);
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
      expect(lastMessage.role).toBe("system");
      expect(lastMessage.content).toContain("generate a brief summary");
    });
  });

  // ---- Helper Functions ----
  function createDefaultChatSettings(): ChatSettings {
    return {
      timestampCreatedUtcMs: Date.now(),
      chatTitle: "Test Chat",
      promptType: "First Person Character",
    };
  }

  function createChatSettingsWithCustomPrompt(
    customPrompt: string
  ): ChatSettings {
    return {
      ...createDefaultChatSettings(),
      promptType: "Manual",
      customPrompt,
    };
  }

  function createChatSettingsWithEmptyCustomPrompt(): ChatSettings {
    return {
      ...createDefaultChatSettings(),
      promptType: "Manual",
      customPrompt: "",
    };
  }

  function createMockChatMessages(): LLMMessage[] {
    return [
      { id: "msg-1", role: "user", content: "Hello" },
      { id: "msg-2", role: "assistant", content: "Hi there!" },
    ];
  }

  function createMockPlans(): Plan[] {
    return [
      {
        id: "plan-1",
        type: "planning",
        name: "Plan 1",
        prompt: "Prompt 1",
        content: "Content 1",
      },
      {
        id: "plan-2",
        type: "planning",
        name: "Plan 2",
        prompt: "Prompt 2",
        content: "Content 2",
      },
    ];
  }

  function createPlanWithUndefinedContent(): Plan {
    return {
      id: "plan-empty",
      type: "planning",
      name: "Empty Plan",
      prompt: "Prompt",
    };
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
    expectedContent: string
  ): void {
    expect(message.role).toBe("system");
    expect(message.content).toBe(expectedContent);
  }

  function expectStoryPromptIsLast(messages: LLMMessage[]): void {
    const lastMessage = messages[messages.length - 1];
    expect(lastMessage.role).toBe("system");
    expect(lastMessage.content).toBe(FirstPersonCharacterPrompt);
  }

  function expectMessagesContainChatMessages(messages: LLMMessage[]): void {
    const userMessage = messages.find((m) => m.content === "Hello");
    const assistantMessage = messages.find((m) => m.content === "Hi there!");
    expect(userMessage).toBeDefined();
    expect(assistantMessage).toBeDefined();
  }

  function expectMessagesContainPlans(messages: LLMMessage[]): void {
    const planMessage = messages.find((m) => m.content.includes("Plan 1"));
    expect(planMessage).toBeDefined();
  }

  function expectMessagesContainMemories(messages: LLMMessage[]): void {
    const memoryMessage = messages.find((m) =>
      m.content.includes("# Memories")
    );
    expect(memoryMessage).toBeDefined();
  }
});
