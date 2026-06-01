import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createNewBookDiscussionConfig } from "./NewBookDiscussionConfig";
import { d } from "../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";

vi.mock("../../../services/Dependencies");

describe("NewBookDiscussionConfig", () => {
  const testChatId = "chat-123";
  const testTitle = "Book One";
  const chapterIds = ["chapter-1", "chapter-2"];

  let mockUserChatProjection: {
    GetMessages: ReturnType<typeof vi.fn>;
  };

  let mockOpenRouterChatAPI: {
    postChat: ReturnType<typeof vi.fn>;
  };

  let mockChatService: {
    AddBook: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockUserChatProjection = {
      GetMessages: vi.fn().mockReturnValue([
        {
          id: "chapter-1",
          type: "chapter",
          content: "First chapter summary.",
          data: { title: "Chapter One" },
        },
        {
          id: "chapter-2",
          type: "chapter",
          content: "Second chapter summary.",
          data: { title: "Chapter Two" },
        },
      ]),
    };

    mockOpenRouterChatAPI = {
      postChat: vi.fn().mockResolvedValue("Generated book summary."),
    };

    mockChatService = {
      AddBook: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(d.UserChatProjection).mockReturnValue(
      mockUserChatProjection as unknown as ReturnType<
        typeof d.UserChatProjection
      >,
    );
    vi.mocked(d.OpenRouterChatAPI).mockReturnValue(
      mockOpenRouterChatAPI as unknown as ReturnType<
        typeof d.OpenRouterChatAPI
      >,
    );
    vi.mocked(d.ChatService).mockReturnValue(
      mockChatService as unknown as ReturnType<typeof d.ChatService>,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns selected chapter summaries as discussion context", () => {
    const config = createNewBookDiscussionConfig(
      testChatId,
      testTitle,
      chapterIds,
    );

    const messages = config.getChatMessages();

    expect(messages[0].content).toContain("Chapter One");
    expect(messages[0].content).toContain("First chapter summary.");
    expect(messages[0].content).toContain("Chapter Two");
    expect(messages[0].content).toContain("Second chapter summary.");
  });

  it("builds a new book discussion system prompt", () => {
    const config = createNewBookDiscussionConfig(
      testChatId,
      testTitle,
      chapterIds,
    );

    const prompt = config.buildSystemPrompt();

    expect(prompt).toContain("Book One");
    expect(prompt).toContain("does not have a summary yet");
  });

  it("uses the book summary prompt as the initial prompt", () => {
    const config = createNewBookDiscussionConfig(
      testChatId,
      testTitle,
      chapterIds,
    );

    expect(config.buildInitialPrompt!()).toBe(
      DEFAULT_SYSTEM_PROMPTS.bookSummaryPrompt,
    );
  });

  it("creates a book with the generated summary", async () => {
    const config = createNewBookDiscussionConfig(
      testChatId,
      testTitle,
      chapterIds,
    );

    await config.generateFromFeedback("Focus on the romance arc");

    expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
      expect.any(Array),
      undefined,
      "chat",
      "LLM",
      undefined,
    );
    expect(mockChatService.AddBook).toHaveBeenCalledWith(
      "Book One",
      "Generated book summary.",
      chapterIds,
    );
  });

  it("passes book summary model to postChat", async () => {
    const config = createNewBookDiscussionConfig(
      testChatId,
      testTitle,
      chapterIds,
      "anthropic/claude-opus-4",
    );

    await config.generateFromFeedback("Make it tighter");

    expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
      expect.any(Array),
      "anthropic/claude-opus-4",
      "chat",
      "LLM",
      undefined,
    );
  });

  it("accepts a message as the book summary directly", async () => {
    const config = createNewBookDiscussionConfig(
      testChatId,
      testTitle,
      chapterIds,
    );

    await config.acceptMessage!("Direct summary");

    expect(mockChatService.AddBook).toHaveBeenCalledWith(
      "Book One",
      "Direct summary",
      chapterIds,
    );
    expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
  });
});
