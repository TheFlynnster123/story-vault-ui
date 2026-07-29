import { beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../../../../services/Dependencies";
import {
  ChapterGenerationService,
  parseChapterDraft,
} from "./ChapterGenerationService";

vi.mock("../../../../services/Dependencies");

const CHAT_ID = "chat-1";
const SNAPSHOT = [{ role: "user" as const, content: "Story context" }];
const CONTEXT_MESSAGES = [{ role: "system" as const, content: "Context" }];

describe("ChapterGenerationService", () => {
  const buildContext = vi.fn();
  const postChat = vi.fn();
  const getPrompts = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    buildContext.mockResolvedValue(CONTEXT_MESSAGES);
    postChat.mockResolvedValue(
      JSON.stringify({ title: "Chapter One", summary: "A concise summary." }),
    );
    getPrompts.mockResolvedValue({});
    vi.mocked(d.LLMMessageContextService).mockReturnValue({
      buildContext,
    } as never);
    vi.mocked(d.OpenRouterChatAPI).mockReturnValue({ postChat } as never);
    vi.mocked(d.SystemPromptsService).mockReturnValue({
      Get: getPrompts,
    } as never);
  });

  it("generates both fields with one model request", async () => {
    const service = new ChapterGenerationService(CHAT_ID);

    const result = await service.generateChapterDraft(SNAPSHOT);

    expect(buildContext).toHaveBeenCalledWith(
      {
        history: true,
        memories: true,
        characterSheets: true,
        continuityHistories: true,
        plans: true,
      },
      { historyOverride: SNAPSHOT },
    );
    expect(postChat).toHaveBeenCalledOnce();
    expect(result).toEqual({
      title: "Chapter One",
      summary: "A concise summary.",
    });
  });

  it("uses the configured chapter summary model and settings", async () => {
    getPrompts.mockResolvedValue({
      chapterSummaryModel: "openai/gpt-5",
      chapterSummaryRequestSettings: { temperature: 0.3 },
    });
    const service = new ChapterGenerationService(CHAT_ID);

    await service.generateChapterDraft(SNAPSHOT);

    expect(postChat).toHaveBeenCalledWith(
      expect.arrayContaining([
        CONTEXT_MESSAGES[0],
        expect.objectContaining({
          content: expect.stringContaining(
            "Return one JSON object with exactly two string fields",
          ),
        }),
      ]),
      "openai/gpt-5",
      "chat",
      "LLM",
      { temperature: 0.3 },
    );
  });

  it("clears loading state after a request failure", async () => {
    postChat.mockRejectedValue(new Error("failed"));
    const service = new ChapterGenerationService(CHAT_ID);

    await expect(service.generateChapterDraft(SNAPSHOT)).rejects.toThrow(
      "failed",
    );

    expect(service.IsLoading).toBe(false);
    expect(service.Status).toBeUndefined();
  });
});

describe("parseChapterDraft", () => {
  it("parses and trims a structured response", () => {
    const result = parseChapterDraft(
      '{"title":"  Chapter One ","summary":" Summary.  "}',
    );

    expect(result.title).toBe("Chapter One");
    expect(result.summary).toBe("Summary.");
  });

  it("accepts a JSON markdown fence", () => {
    const result = parseChapterDraft(
      '```json\n{"title":"Chapter","summary":"Summary"}\n```',
    );

    expect(result).toEqual({ title: "Chapter", summary: "Summary" });
  });

  it("rejects invalid JSON", () => {
    expect(() => parseChapterDraft("not json")).toThrow(
      "response was not valid JSON",
    );
  });

  it("rejects an incomplete draft", () => {
    expect(() => parseChapterDraft('{"title":"Chapter"}')).toThrow(
      "response was incomplete",
    );
  });
});
