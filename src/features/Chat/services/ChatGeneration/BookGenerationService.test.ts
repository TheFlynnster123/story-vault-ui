import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BookGenerationService } from "./BookGenerationService";
import { d } from "../../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../../../Prompts/services/SystemPrompts";

vi.mock("../../../../services/Dependencies");

describe("BookGenerationService", () => {
  const testChatId = "test-chat-123";

  let mockLLMMessageContextService: {
    buildBookSummaryRequestMessages: ReturnType<typeof vi.fn>;
    buildBookTitleRequestMessages: ReturnType<typeof vi.fn>;
  };

  let mockOpenRouterChatAPI: {
    postChat: ReturnType<typeof vi.fn>;
  };

  let mockSystemPromptsService: {
    Get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockLLMMessageContextService = {
      buildBookSummaryRequestMessages: vi
        .fn()
        .mockResolvedValue([{ role: "system", content: "book summary prompt" }]),
      buildBookTitleRequestMessages: vi
        .fn()
        .mockResolvedValue([{ role: "system", content: "book title prompt" }]),
    };

    mockOpenRouterChatAPI = {
      postChat: vi.fn().mockResolvedValue("Generated book content"),
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

  // ---- generateBookSummary Tests ----
  describe("generateBookSummary", () => {
    it("should call LLMMessageContextService with chapter summaries", async () => {
      const service = new BookGenerationService(testChatId);
      const summaries = ["Chapter 1 summary", "Chapter 2 summary"];

      await service.generateBookSummary(summaries);

      expect(
        mockLLMMessageContextService.buildBookSummaryRequestMessages,
      ).toHaveBeenCalledWith(summaries);
    });

    it("should call OpenRouterChatAPI with request messages", async () => {
      const service = new BookGenerationService(testChatId);

      await service.generateBookSummary(["Summary 1"]);

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });

    it("should return generated content", async () => {
      const service = new BookGenerationService(testChatId);

      const result = await service.generateBookSummary(["Summary 1"]);

      expect(result).toBe("Generated book content");
    });

    it("should not pass model override when no model is configured", async () => {
      mockSystemPromptsService.Get.mockResolvedValue(DEFAULT_SYSTEM_PROMPTS);
      const service = new BookGenerationService(testChatId);

      await service.generateBookSummary(["Summary"]);

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });

    it("should pass model override when bookSummaryModel is configured", async () => {
      mockSystemPromptsService.Get.mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        bookSummaryModel: "anthropic/claude-opus-4",
      });
      const service = new BookGenerationService(testChatId);

      await service.generateBookSummary(["Summary"]);

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        "anthropic/claude-opus-4",
      );
    });

    it("should not pass model override when bookSummaryModel is empty string", async () => {
      mockSystemPromptsService.Get.mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        bookSummaryModel: "",
      });
      const service = new BookGenerationService(testChatId);

      await service.generateBookSummary(["Summary"]);

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });

    it("should fall back to undefined when system prompts return undefined", async () => {
      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      const service = new BookGenerationService(testChatId);

      await service.generateBookSummary(["Summary"]);

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });
  });

  // ---- generateBookTitle Tests ----
  describe("generateBookTitle", () => {
    it("should call LLMMessageContextService with chapter summaries", async () => {
      const service = new BookGenerationService(testChatId);
      const summaries = ["Chapter 1 summary", "Chapter 2 summary"];

      await service.generateBookTitle(summaries);

      expect(
        mockLLMMessageContextService.buildBookTitleRequestMessages,
      ).toHaveBeenCalledWith(summaries);
    });

    it("should return generated title", async () => {
      const service = new BookGenerationService(testChatId);

      const result = await service.generateBookTitle(["Summary 1"]);

      expect(result).toBe("Generated book content");
    });

    it("should not pass model override when no model is configured", async () => {
      mockSystemPromptsService.Get.mockResolvedValue(DEFAULT_SYSTEM_PROMPTS);
      const service = new BookGenerationService(testChatId);

      await service.generateBookTitle(["Summary"]);

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });

    it("should pass model override when bookTitleModel is configured", async () => {
      mockSystemPromptsService.Get.mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        bookTitleModel: "openai/gpt-5",
      });
      const service = new BookGenerationService(testChatId);

      await service.generateBookTitle(["Summary"]);

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        "openai/gpt-5",
      );
    });

    it("should not pass model override when bookTitleModel is empty string", async () => {
      mockSystemPromptsService.Get.mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        bookTitleModel: "",
      });
      const service = new BookGenerationService(testChatId);

      await service.generateBookTitle(["Summary"]);

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });
  });
});
