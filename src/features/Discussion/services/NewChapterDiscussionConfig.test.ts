import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createNewChapterDiscussionConfig } from "./NewChapterDiscussionConfig";
import { d } from "../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";

vi.mock("../../../services/Dependencies");

describe("NewChapterDiscussionConfig", () => {
  const testChatId = "chat-123";
  const testTitle = "Chapter One";

  let mockLLMChatProjection: {
    GetMessages: ReturnType<typeof vi.fn>;
  };

  let mockOpenRouterChatAPI: {
    postChat: ReturnType<typeof vi.fn>;
  };

  let mockChatService: {
    AddChapter: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockLLMChatProjection = {
      GetMessages: vi.fn().mockReturnValue([
        { role: "user", content: "Hello" },
        { role: "assistant", content: "World" },
      ]),
    };

    mockOpenRouterChatAPI = {
      postChat: vi.fn().mockResolvedValue("Generated chapter summary."),
    };

    mockChatService = {
      AddChapter: vi.fn().mockResolvedValue("chapter-new"),
    };

    vi.mocked(d.LLMChatProjection).mockReturnValue(
      mockLLMChatProjection as any,
    );
    vi.mocked(d.OpenRouterChatAPI).mockReturnValue(
      mockOpenRouterChatAPI as any,
    );
    vi.mocked(d.ChatService).mockReturnValue(mockChatService as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getChatMessages", () => {
    it("should return messages from LLMChatProjection", () => {
      const config = createNewChapterDiscussionConfig(testChatId, testTitle);
      const messages = config.getChatMessages();
      expect(messages).toEqual([
        { role: "user", content: "Hello" },
        { role: "assistant", content: "World" },
      ]);
    });
  });

  describe("getDefaultModel", () => {
    it("should return undefined when no model is provided", () => {
      const config = createNewChapterDiscussionConfig(testChatId, testTitle);
      expect(config.getDefaultModel()).toBeUndefined();
    });

    it("should return the chapter summary model when provided", () => {
      const config = createNewChapterDiscussionConfig(
        testChatId,
        testTitle,
        "anthropic/claude-opus-4",
      );
      expect(config.getDefaultModel()).toBe("anthropic/claude-opus-4");
    });

    it("should return undefined for empty string model", () => {
      const config = createNewChapterDiscussionConfig(
        testChatId,
        testTitle,
        "",
      );
      expect(config.getDefaultModel()).toBeUndefined();
    });
  });

  describe("buildSystemPrompt", () => {
    it("should include chapter title", () => {
      const config = createNewChapterDiscussionConfig(testChatId, testTitle);
      const prompt = config.buildSystemPrompt();
      expect(prompt).toContain("Chapter One");
    });

    it("should indicate no summary exists yet", () => {
      const config = createNewChapterDiscussionConfig(testChatId, testTitle);
      const prompt = config.buildSystemPrompt();
      expect(prompt).toContain("does not have a summary yet");
    });
  });

  describe("buildInitialPrompt", () => {
    it("should return the default chapter summary prompt when no custom prompt provided", () => {
      const config = createNewChapterDiscussionConfig(testChatId, testTitle);
      const prompt = config.buildInitialPrompt!();
      expect(prompt).toBe(DEFAULT_SYSTEM_PROMPTS.chapterSummaryPrompt);
    });

    it("should return the custom prompt when provided", () => {
      const customPrompt = "Summarize this chapter in pirate speak.";
      const config = createNewChapterDiscussionConfig(
        testChatId,
        testTitle,
        undefined,
        customPrompt,
      );
      const prompt = config.buildInitialPrompt!();
      expect(prompt).toBe(customPrompt);
    });
  });

  describe("generateFromFeedback", () => {
    it("should pass chat messages and feedback to postChat", async () => {
      const config = createNewChapterDiscussionConfig(testChatId, testTitle);

      await config.generateFromFeedback("Include the dragon fight");

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.arrayContaining([
          { role: "user", content: "Hello" },
          { role: "assistant", content: "World" },
        ]),
        undefined,
      );
    });

    it("should include feedback in the system prompt", async () => {
      const config = createNewChapterDiscussionConfig(testChatId, testTitle);

      await config.generateFromFeedback("Include the dragon fight");

      const callMessages = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      const systemMessages = callMessages.filter(
        (m: any) => m.role === "system",
      );
      expect(
        systemMessages.some((m: any) =>
          m.content.includes("Include the dragon fight"),
        ),
      ).toBe(true);
    });

    it("should include chapter title in system prompt", async () => {
      const config = createNewChapterDiscussionConfig(testChatId, testTitle);

      await config.generateFromFeedback("Some feedback");

      const callMessages = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      const systemMessages = callMessages.filter(
        (m: any) => m.role === "system",
      );
      expect(
        systemMessages.some((m: any) => m.content.includes("Chapter One")),
      ).toBe(true);
    });

    it("should create chapter with AddChapter using generated summary", async () => {
      const config = createNewChapterDiscussionConfig(testChatId, testTitle);

      await config.generateFromFeedback("Make it dramatic");

      expect(mockChatService.AddChapter).toHaveBeenCalledWith(
        "Chapter One",
        "Generated chapter summary.",
      );
    });

    it("should pass chapter summary model to postChat", async () => {
      const config = createNewChapterDiscussionConfig(
        testChatId,
        testTitle,
        "anthropic/claude-opus-4",
      );

      await config.generateFromFeedback("Make it dramatic");

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        "anthropic/claude-opus-4",
      );
    });

    it("should pass undefined model when no model provided", async () => {
      const config = createNewChapterDiscussionConfig(testChatId, testTitle);

      await config.generateFromFeedback("Make it dramatic");

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });

    it("should use custom chapter summary prompt in system message", async () => {
      const customPrompt = "Custom chapter summary instructions.";
      const config = createNewChapterDiscussionConfig(
        testChatId,
        testTitle,
        undefined,
        customPrompt,
      );

      await config.generateFromFeedback("Add more detail");

      const callMessages = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      const systemMessages = callMessages.filter(
        (m: any) => m.role === "system",
      );
      expect(
        systemMessages.some((m: any) => m.content.includes(customPrompt)),
      ).toBe(true);
    });

    it("should use default chapter summary prompt when none provided", async () => {
      const config = createNewChapterDiscussionConfig(testChatId, testTitle);

      await config.generateFromFeedback("Add more detail");

      const callMessages = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      const systemMessages = callMessages.filter(
        (m: any) => m.role === "system",
      );
      expect(
        systemMessages.some((m: any) =>
          m.content.includes(DEFAULT_SYSTEM_PROMPTS.chapterSummaryPrompt),
        ),
      ).toBe(true);
    });
  });

  describe("acceptMessage", () => {
    it("should create chapter with the provided content directly", async () => {
      const config = createNewChapterDiscussionConfig(testChatId, testTitle);

      await config.acceptMessage!("The heroes defeated the dragon.");

      expect(mockChatService.AddChapter).toHaveBeenCalledWith(
        "Chapter One",
        "The heroes defeated the dragon.",
      );
    });

    it("should not call postChat", async () => {
      const config = createNewChapterDiscussionConfig(testChatId, testTitle);

      await config.acceptMessage!("Direct summary");

      expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
    });

    it("should be defined on the config", () => {
      const config = createNewChapterDiscussionConfig(testChatId, testTitle);
      expect(config.acceptMessage).toBeDefined();
    });
  });
});
