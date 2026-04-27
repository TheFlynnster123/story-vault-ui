import { describe, it, expect, beforeEach, vi } from "vitest";
import { ImageGenerator } from "./ImageGenerator";
import { d } from "../../../services/Dependencies";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";

vi.mock("../../../services/Dependencies");

describe("ImageGenerator", () => {
  let imageGenerator: ImageGenerator;
  let mockOpenRouterChatAPI: any;
  let mockSystemPromptsService: any;
  let mockChatImageModelService: any;
  let mockCharacterSelectionService: any;
  let mockCharacterDescriptionsService: any;
  const chatId = "test-chat-123";

  beforeEach(() => {
    mockOpenRouterChatAPI = {
      postChat: vi.fn(),
    };

    mockSystemPromptsService = {
      Get: vi.fn(),
    };

    mockChatImageModelService = {
      getSelectedModelOrDefault: vi.fn().mockResolvedValue({
        imageGenerationPrompt: "",
        input: {},
      }),
    };

    mockCharacterSelectionService = {
      selectCharacterForImage: vi.fn(),
    };

    mockCharacterDescriptionsService = {
      findByName: vi.fn(),
      createBlankCharacter: vi.fn(),
    };

    (d.OpenRouterChatAPI as any) = vi.fn(() => mockOpenRouterChatAPI);
    (d.SystemPromptsService as any) = vi.fn(() => mockSystemPromptsService);
    (d.ChatImageModelService as any) = vi.fn(() => mockChatImageModelService);
    (d.CharacterSelectionService as any) = vi.fn(
      () => mockCharacterSelectionService,
    );
    (d.CharacterDescriptionsService as any) = vi.fn(
      () => mockCharacterDescriptionsService,
    );

    imageGenerator = new ImageGenerator(chatId);
  });

  describe("generatePrompt", () => {
    it("should generate prompt without character description when no character selected", async () => {
      const messages = createMockMessages();
      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockCharacterSelectionService.selectCharacterForImage.mockResolvedValue(
        null,
      );
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Generated prompt");

      const result = await imageGenerator.generatePrompt(messages);

      expect(result).toBe("Generated prompt");
      expect(
        mockCharacterSelectionService.selectCharacterForImage,
      ).toHaveBeenCalled();
    });

    it("should generate prompt with character description when character exists", async () => {
      const messages = createMockMessages();
      const characterName = "Sarah Chen";
      const characterDescription = "Young woman with dark hair and green eyes";

      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockCharacterSelectionService.selectCharacterForImage.mockResolvedValue(
        characterName,
      );
      mockCharacterDescriptionsService.findByName.mockResolvedValue({
        id: "char-1",
        name: characterName,
        description: characterDescription,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      });
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Generated prompt");

      await imageGenerator.generatePrompt(messages);

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0];
      const promptMessages = callArgs[0];

      // Should include character description in messages
      const characterMessage = promptMessages.find((m: LLMMessage) =>
        m.content.includes(characterName),
      );
      expect(characterMessage).toBeDefined();
      expect(characterMessage.content).toContain(characterDescription);
    });

    it("should create blank character when character selected but no description exists", async () => {
      const messages = createMockMessages();
      const characterName = "Sarah Chen";

      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockCharacterSelectionService.selectCharacterForImage.mockResolvedValue(
        characterName,
      );
      mockCharacterDescriptionsService.findByName.mockResolvedValue(undefined);
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Generated prompt");

      await imageGenerator.generatePrompt(messages);

      expect(
        mockCharacterDescriptionsService.createBlankCharacter,
      ).toHaveBeenCalledWith(characterName);
    });

    it("should not include character description when character exists but description is empty", async () => {
      const messages = createMockMessages();
      const characterName = "Sarah Chen";

      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockCharacterSelectionService.selectCharacterForImage.mockResolvedValue(
        characterName,
      );
      mockCharacterDescriptionsService.findByName.mockResolvedValue({
        id: "char-1",
        name: characterName,
        description: "",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      });
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Generated prompt");

      await imageGenerator.generatePrompt(messages);

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0];
      const promptMessages = callArgs[0];

      // Should not include character message when description is empty
      const characterMessage = promptMessages.find((m: LLMMessage) =>
        m.content.includes(`# Character: ${characterName}`),
      );
      expect(characterMessage).toBeUndefined();
      expect(
        mockCharacterDescriptionsService.createBlankCharacter,
      ).not.toHaveBeenCalled();
    });

    it("should use custom image model when specified", async () => {
      const messages = createMockMessages();
      const customModel = "custom-image-model";

      mockSystemPromptsService.Get.mockResolvedValue({
        defaultImageModel: customModel,
      });
      mockCharacterSelectionService.selectCharacterForImage.mockResolvedValue(
        null,
      );
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Generated prompt");

      await imageGenerator.generatePrompt(messages);

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0];
      expect(callArgs[1]).toBe(customModel);
    });
  });

  describe("generatePromptWithFeedback", () => {
    it("should delegate to generatePrompt when no feedback provided", async () => {
      const messages = createMockMessages();
      const originalPrompt = "Original prompt";

      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockCharacterSelectionService.selectCharacterForImage.mockResolvedValue(
        null,
      );
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Generated prompt");

      await imageGenerator.generatePromptWithFeedback(
        messages,
        originalPrompt,
        undefined,
      );

      expect(
        mockCharacterSelectionService.selectCharacterForImage,
      ).toHaveBeenCalled();
    });

    it("should include feedback message when feedback provided", async () => {
      const messages = createMockMessages();
      const originalPrompt = "Original prompt";
      const feedback = "Make it darker";

      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockCharacterSelectionService.selectCharacterForImage.mockResolvedValue(
        null,
      );
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Generated prompt");

      await imageGenerator.generatePromptWithFeedback(
        messages,
        originalPrompt,
        feedback,
      );

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0];
      const promptMessages = callArgs[0];

      const feedbackMessage = promptMessages.find((m: LLMMessage) =>
        m.content.includes(feedback),
      );
      expect(feedbackMessage).toBeDefined();
    });

    it("should include character description with feedback", async () => {
      const messages = createMockMessages();
      const originalPrompt = "Original prompt";
      const feedback = "Make it darker";
      const characterName = "Sarah Chen";
      const characterDescription = "Young woman with dark hair and green eyes";

      mockSystemPromptsService.Get.mockResolvedValue(undefined);
      mockCharacterSelectionService.selectCharacterForImage.mockResolvedValue(
        characterName,
      );
      mockCharacterDescriptionsService.findByName.mockResolvedValue({
        id: "char-1",
        name: characterName,
        description: characterDescription,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      });
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Generated prompt");

      await imageGenerator.generatePromptWithFeedback(
        messages,
        originalPrompt,
        feedback,
      );

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0];
      const promptMessages = callArgs[0];

      const characterMessage = promptMessages.find((m: LLMMessage) =>
        m.content.includes(characterName),
      );
      expect(characterMessage).toBeDefined();

      const feedbackMessage = promptMessages.find((m: LLMMessage) =>
        m.content.includes(feedback),
      );
      expect(feedbackMessage).toBeDefined();
    });
  });
});

const createMockMessages = (): LLMMessage[] => [
  { id: "1", role: "user", content: "Sarah walked into the room." },
  { id: "2", role: "assistant", content: "She looked around nervously." },
];
