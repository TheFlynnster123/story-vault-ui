import { describe, it, expect, beforeEach, vi } from "vitest";
import { CharacterSelectionService } from "./CharacterSelectionService";
import { d } from "../../../services/Dependencies";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";

vi.mock("../../../services/Dependencies");

describe("CharacterSelectionService", () => {
  let service: CharacterSelectionService;
  let mockLLMChatProjection: any;
  let mockOpenRouterChatAPI: any;
  let mockSystemPromptsService: any;
  const chatId = "test-chat-123";

  beforeEach(() => {
    mockLLMChatProjection = {
      GetMessages: vi.fn(),
    };

    mockOpenRouterChatAPI = {
      postChat: vi.fn(),
    };

    mockSystemPromptsService = {
      Get: vi.fn(),
    };

    (d.LLMChatProjection as any) = vi.fn(() => mockLLMChatProjection);
    (d.OpenRouterChatAPI as any) = vi.fn(() => mockOpenRouterChatAPI);
    (d.SystemPromptsService as any) = vi.fn(() => mockSystemPromptsService);

    service = new CharacterSelectionService(chatId);
  });

  describe("selectCharacterForImage", () => {
    it("should return character name when LLM responds with a name", async () => {
      mockLLMChatProjection.GetMessages.mockReturnValue(createMockMessages());
      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Sarah Chen");

      const result = await service.selectCharacterForImage();

      expect(result).toBe("Sarah Chen");
    });

    it("should trim whitespace from character name", async () => {
      mockLLMChatProjection.GetMessages.mockReturnValue(createMockMessages());
      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockOpenRouterChatAPI.postChat.mockResolvedValue("  Sarah Chen  ");

      const result = await service.selectCharacterForImage();

      expect(result).toBe("Sarah Chen");
    });

    it("should remove quotes from character name", async () => {
      mockLLMChatProjection.GetMessages.mockReturnValue(createMockMessages());
      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockOpenRouterChatAPI.postChat.mockResolvedValue('"Sarah Chen"');

      const result = await service.selectCharacterForImage();

      expect(result).toBe("Sarah Chen");
    });

    it("should return null when LLM responds with UNCLEAR", async () => {
      mockLLMChatProjection.GetMessages.mockReturnValue(createMockMessages());
      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockOpenRouterChatAPI.postChat.mockResolvedValue("UNCLEAR");

      const result = await service.selectCharacterForImage();

      expect(result).toBeNull();
    });

    it("should return null when LLM responds with unclear (case insensitive)", async () => {
      mockLLMChatProjection.GetMessages.mockReturnValue(createMockMessages());
      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockOpenRouterChatAPI.postChat.mockResolvedValue("unclear");

      const result = await service.selectCharacterForImage();

      expect(result).toBeNull();
    });

    it("should return null when LLM responds with empty string", async () => {
      mockLLMChatProjection.GetMessages.mockReturnValue(createMockMessages());
      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockOpenRouterChatAPI.postChat.mockResolvedValue("");

      const result = await service.selectCharacterForImage();

      expect(result).toBeNull();
    });

    it("should use custom prompt when available", async () => {
      const customPrompt = "Custom character selection prompt";
      mockLLMChatProjection.GetMessages.mockReturnValue(createMockMessages());
      mockSystemPromptsService.Get.mockResolvedValue({
        characterSelectionPrompt: customPrompt,
      });
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Sarah Chen");

      await service.selectCharacterForImage();

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0];
      const lastMessage = callArgs[0][callArgs[0].length - 1];
      expect(lastMessage.content).toBe(customPrompt);
    });

    it("should use custom model when available", async () => {
      const customModel = "custom-model-id";
      mockLLMChatProjection.GetMessages.mockReturnValue(createMockMessages());
      mockSystemPromptsService.Get.mockResolvedValue({
        characterSelectionModel: customModel,
      });
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Sarah Chen");

      await service.selectCharacterForImage();

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0];
      expect(callArgs[1]).toBe(customModel);
    });

    it("should include chat messages in prompt", async () => {
      const messages = createMockMessages();
      mockLLMChatProjection.GetMessages.mockReturnValue(messages);
      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Sarah Chen");

      await service.selectCharacterForImage();

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0];
      const promptMessages = callArgs[0];
      expect(promptMessages).toContain(messages[0]);
      expect(promptMessages).toContain(messages[1]);
    });
  });
});

const createMockMessages = (): LLMMessage[] => [
  { id: "1", role: "user", content: "Sarah walked into the room." },
  { id: "2", role: "assistant", content: "She looked around nervously." },
];
