import { describe, it, expect, beforeEach, vi } from "vitest";
import { CharacterDescriptionGenerationService } from "./CharacterDescriptionGenerationService";
import { d } from "../../../services/Dependencies";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";

vi.mock("../../../services/Dependencies");

describe("CharacterDescriptionGenerationService", () => {
  let service: CharacterDescriptionGenerationService;
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

    service = new CharacterDescriptionGenerationService(chatId);
  });

  describe("generateDescription", () => {
    it("should generate character description", async () => {
      const expectedDescription =
        "Sarah is a young woman in her mid-twenties with long dark hair and green eyes. She has a slender build and stands about 5'6 tall.";
      mockLLMChatProjection.GetMessages.mockReturnValue(createMockMessages());
      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockOpenRouterChatAPI.postChat.mockResolvedValue(expectedDescription);

      const result = await service.generateDescription("Sarah Chen");

      expect(result).toBe(expectedDescription);
    });

    it("should trim whitespace from description", async () => {
      mockLLMChatProjection.GetMessages.mockReturnValue(createMockMessages());
      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockOpenRouterChatAPI.postChat.mockResolvedValue("  Description text  ");

      const result = await service.generateDescription("Sarah Chen");

      expect(result).toBe("Description text");
    });

    it("should include character name in prompt", async () => {
      const characterName = "Sarah Chen";
      mockLLMChatProjection.GetMessages.mockReturnValue(createMockMessages());
      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Description");

      await service.generateDescription(characterName);

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0];
      const lastMessage = callArgs[0][callArgs[0].length - 1];
      expect(lastMessage.content).toContain(characterName);
    });

    it("should use custom prompt when available", async () => {
      const customPrompt = "Custom character description prompt";
      mockLLMChatProjection.GetMessages.mockReturnValue(createMockMessages());
      mockSystemPromptsService.Get.mockResolvedValue({
        characterDescriptionPrompt: customPrompt,
      });
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Description");

      await service.generateDescription("Sarah Chen");

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0];
      const lastMessage = callArgs[0][callArgs[0].length - 1];
      expect(lastMessage.content).toContain(customPrompt);
    });

    it("should use custom model when available", async () => {
      const customModel = "custom-model-id";
      mockLLMChatProjection.GetMessages.mockReturnValue(createMockMessages());
      mockSystemPromptsService.Get.mockResolvedValue({
        characterDescriptionModel: customModel,
      });
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Description");

      await service.generateDescription("Sarah Chen");

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0];
      expect(callArgs[1]).toBe(customModel);
    });

    it("should include chat messages in prompt", async () => {
      const messages = createMockMessages();
      mockLLMChatProjection.GetMessages.mockReturnValue(messages);
      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Description");

      await service.generateDescription("Sarah Chen");

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0];
      const promptMessages = callArgs[0];
      expect(promptMessages).toContain(messages[0]);
      expect(promptMessages).toContain(messages[1]);
    });
  });
});

const createMockMessages = (): LLMMessage[] => [
  {
    id: "1",
    role: "user",
    content:
      "Sarah walked into the room. She had dark hair and striking green eyes.",
  },
  {
    id: "2",
    role: "assistant",
    content: "The young woman looked around nervously.",
  },
];
