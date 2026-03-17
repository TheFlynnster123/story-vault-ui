import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ChapterGenerationService } from "./ChapterGenerationService";
import { d } from "../../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../../../Prompts/services/SystemPrompts";

vi.mock("../../../../services/Dependencies");

describe("ChapterGenerationService", () => {
  const testChatId = "test-chat-123";

  let mockLLMMessageContextService: {
    buildChapterSummaryRequestMessages: ReturnType<typeof vi.fn>;
    buildChapterTitleRequestMessages: ReturnType<typeof vi.fn>;
  };

  let mockOpenRouterChatAPI: {
    postChat: ReturnType<typeof vi.fn>;
  };

  let mockSystemPromptsService: {
    Get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockLLMMessageContextService = {
      buildChapterSummaryRequestMessages: vi
        .fn()
        .mockResolvedValue([{ role: "system", content: "summary prompt" }]),
      buildChapterTitleRequestMessages: vi
        .fn()
        .mockResolvedValue([{ role: "system", content: "title prompt" }]),
    };

    mockOpenRouterChatAPI = {
      postChat: vi.fn().mockResolvedValue("Generated content"),
    };

    mockSystemPromptsService = {
      Get: vi.fn().mockResolvedValue(DEFAULT_SYSTEM_PROMPTS),
    };

    vi.mocked(d.LLMMessageContextService).mockReturnValue(
      mockLLMMessageContextService as any,
    );
    vi.mocked(d.OpenRouterChatAPI).mockReturnValue(
      mockOpenRouterChatAPI as any,
    );
    vi.mocked(d.SystemPromptsService).mockReturnValue(
      mockSystemPromptsService as any,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---- generateChapterSummary Model Override Tests ----
  describe("generateChapterSummary", () => {
    it("should not pass model override when no model is configured", async () => {
      mockSystemPromptsService.Get.mockResolvedValue(DEFAULT_SYSTEM_PROMPTS);
      const service = new ChapterGenerationService(testChatId);

      await service.generateChapterSummary();

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });

    it("should pass model override when chapterSummaryModel is configured", async () => {
      mockSystemPromptsService.Get.mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        chapterSummaryModel: "anthropic/claude-opus-4",
      });
      const service = new ChapterGenerationService(testChatId);

      await service.generateChapterSummary();

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        "anthropic/claude-opus-4",
      );
    });

    it("should not pass model override when chapterSummaryModel is empty string", async () => {
      mockSystemPromptsService.Get.mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        chapterSummaryModel: "",
      });
      const service = new ChapterGenerationService(testChatId);

      await service.generateChapterSummary();

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });

    it("should fall back to undefined when system prompts return undefined", async () => {
      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      const service = new ChapterGenerationService(testChatId);

      await service.generateChapterSummary();

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });
  });

  // ---- generateChapterTitle Model Override Tests ----
  describe("generateChapterTitle", () => {
    it("should not pass model override when no model is configured", async () => {
      mockSystemPromptsService.Get.mockResolvedValue(DEFAULT_SYSTEM_PROMPTS);
      const service = new ChapterGenerationService(testChatId);

      await service.generateChapterTitle();

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });

    it("should pass model override when chapterTitleModel is configured", async () => {
      mockSystemPromptsService.Get.mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        chapterTitleModel: "openai/gpt-5",
      });
      const service = new ChapterGenerationService(testChatId);

      await service.generateChapterTitle();

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        "openai/gpt-5",
      );
    });

    it("should not pass model override when chapterTitleModel is empty string", async () => {
      mockSystemPromptsService.Get.mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        chapterTitleModel: "",
      });
      const service = new ChapterGenerationService(testChatId);

      await service.generateChapterTitle();

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });
  });
});
