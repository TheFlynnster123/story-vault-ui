import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createChapterDiscussionConfig } from "./ChapterDiscussionConfig";
import { d } from "../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";

vi.mock("../../../services/Dependencies");

describe("ChapterDiscussionConfig", () => {
  const testChatId = "chat-123";
  const testChapterId = "chapter-456";

  let mockUserChatProjection: {
    GetMessages: ReturnType<typeof vi.fn>;
  };

  let mockLLMChatProjection: {
    GetMessages: ReturnType<typeof vi.fn>;
  };

  let mockOpenRouterChatAPI: {
    postChat: ReturnType<typeof vi.fn>;
  };

  let mockChatService: {
    EditChapter: ReturnType<typeof vi.fn>;
  };

  const chapterMessage = {
    id: testChapterId,
    type: "chapter",
    content: "Existing chapter summary.",
    data: {
      title: "Chapter One",
    },
  };

  beforeEach(() => {
    mockUserChatProjection = {
      GetMessages: vi.fn().mockReturnValue([chapterMessage]),
    };

    mockLLMChatProjection = {
      GetMessages: vi.fn().mockReturnValue([
        { role: "user", content: "Hello" },
        { role: "assistant", content: "World" },
      ]),
    };

    mockOpenRouterChatAPI = {
      postChat: vi.fn().mockResolvedValue("Updated chapter summary."),
    };

    mockChatService = {
      EditChapter: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(d.UserChatProjection).mockReturnValue(
      mockUserChatProjection as any,
    );
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

  describe("getDefaultModel", () => {
    it("should return undefined when no model is provided", () => {
      const config = createChapterDiscussionConfig(
        testChatId,
        testChapterId,
      );
      expect(config.getDefaultModel()).toBeUndefined();
    });

    it("should return the chapter summary model when provided", () => {
      const config = createChapterDiscussionConfig(
        testChatId,
        testChapterId,
        "anthropic/claude-opus-4",
      );
      expect(config.getDefaultModel()).toBe("anthropic/claude-opus-4");
    });

    it("should return undefined for empty string model", () => {
      const config = createChapterDiscussionConfig(
        testChatId,
        testChapterId,
        "",
      );
      expect(config.getDefaultModel()).toBeUndefined();
    });
  });

  describe("generateFromFeedback", () => {
    it("should pass chapter summary model to postChat", async () => {
      const config = createChapterDiscussionConfig(
        testChatId,
        testChapterId,
        "anthropic/claude-opus-4",
      );

      await config.generateFromFeedback("Make it more dramatic");

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        "anthropic/claude-opus-4",
      );
    });

    it("should pass undefined model when no model provided", async () => {
      const config = createChapterDiscussionConfig(
        testChatId,
        testChapterId,
      );

      await config.generateFromFeedback("Make it more dramatic");

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });

    it("should use custom chapter summary prompt in system message", async () => {
      const customPrompt = "Custom chapter summary instructions.";
      const config = createChapterDiscussionConfig(
        testChatId,
        testChapterId,
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
      const config = createChapterDiscussionConfig(
        testChatId,
        testChapterId,
      );

      await config.generateFromFeedback("Add more detail");

      const callMessages = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      const systemMessages = callMessages.filter(
        (m: any) => m.role === "system",
      );
      expect(
        systemMessages.some((m: any) =>
          m.content.includes(
            DEFAULT_SYSTEM_PROMPTS.chapterSummaryPrompt,
          ),
        ),
      ).toBe(true);
    });

    it("should call EditChapter with the generated response", async () => {
      const config = createChapterDiscussionConfig(
        testChatId,
        testChapterId,
      );

      await config.generateFromFeedback("Make it better");

      expect(mockChatService.EditChapter).toHaveBeenCalledWith(
        testChapterId,
        "Chapter One",
        "Updated chapter summary.",
      );
    });

    it("should not call postChat when chapter is not found", async () => {
      mockUserChatProjection.GetMessages.mockReturnValue([]);

      const config = createChapterDiscussionConfig(
        testChatId,
        testChapterId,
      );

      await config.generateFromFeedback("Make it better");

      expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
    });
  });

  describe("buildSystemPrompt", () => {
    it("should include chapter title in system prompt", () => {
      const config = createChapterDiscussionConfig(
        testChatId,
        testChapterId,
      );
      const prompt = config.buildSystemPrompt();
      expect(prompt).toContain("Chapter One");
    });

    it("should include current summary in system prompt", () => {
      const config = createChapterDiscussionConfig(
        testChatId,
        testChapterId,
      );
      const prompt = config.buildSystemPrompt();
      expect(prompt).toContain("Existing chapter summary.");
    });

    it("should return empty string when chapter not found", () => {
      mockUserChatProjection.GetMessages.mockReturnValue([]);

      const config = createChapterDiscussionConfig(
        testChatId,
        testChapterId,
      );
      expect(config.buildSystemPrompt()).toBe("");
    });
  });
});
