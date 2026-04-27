import { d } from "../../../services/Dependencies";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import type { ImageModel } from "./modelGeneration/ImageModel";
import type { CharacterDescription } from "../../Characters/services/CharacterDescription";
import { toSystemMessage } from "../../../services/Utils/MessageUtils";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";

export type CharacterContext =
  | { type: "none" }
  | {
      type: "existing-description";
      characterName: string;
      description: string;
    }
  | {
      type: "missing-description";
      characterName: string;
    };

export class ImageGenerator {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  /**
   * Generates a scene description prompt using the selected model's prompt or the system default.
   * Includes character description if available.
   */
  public async generatePrompt(messages: LLMMessage[]): Promise<string> {
    const characterContext = await this.resolveCharacterContextForLegacyFlow();

    return await this.generatePromptWithCharacterContext(
      messages,
      characterContext,
    );
  }

  public async generatePromptWithCharacterContext(
    messages: LLMMessage[],
    characterContext: CharacterContext,
  ): Promise<string> {
    const characterDescription = toCharacterContextMessage(characterContext);
    const imageGenerationPrompt = await this.resolveImageGenerationPrompt();

    const promptMessages = buildPromptMessagesWithCharacter(
      messages,
      characterDescription,
      imageGenerationPrompt,
    );

    const model = await this.resolveImageModel();
    return await d.OpenRouterChatAPI().postChat(promptMessages, model);
  }

  public async generatePromptWithFeedback(
    messages: LLMMessage[],
    originalPrompt?: string,
    feedback?: string,
  ): Promise<string> {
    if (!hasFeedback(feedback)) {
      return this.generatePrompt(messages);
    }

    const characterContext = await this.resolveCharacterContextForLegacyFlow();

    return await this.generatePromptWithFeedbackAndCharacterContext(
      messages,
      characterContext,
      originalPrompt,
      feedback,
    );
  }

  public async generatePromptWithFeedbackAndCharacterContext(
    messages: LLMMessage[],
    characterContext: CharacterContext,
    originalPrompt?: string,
    feedback?: string,
  ): Promise<string> {
    const characterDescription = toCharacterContextMessage(characterContext);
    const imageGenerationPrompt = await this.resolveImageGenerationPrompt();
    const feedbackMessage = buildFeedbackMessage(originalPrompt, feedback!);

    const promptMessages = buildPromptMessagesWithCharacterAndFeedback(
      messages,
      characterDescription,
      imageGenerationPrompt,
      feedbackMessage,
    );

    const model = await this.resolveImageModel();
    return await d.OpenRouterChatAPI().postChat(promptMessages, model);
  }

  public async resolveCharacterContext(): Promise<CharacterContext> {
    const characterName = await this.selectCharacter();

    if (!characterName) {
      return noCharacterContext();
    }

    const character = await this.findCharacterDescriptionRecord(characterName);

    if (!character) {
      return {
        type: "missing-description",
        characterName,
      };
    }

    if (!hasDescription(character.description)) {
      return noCharacterContext();
    }

    return {
      type: "existing-description",
      characterName,
      description: character.description,
    };
  }

  public async triggerJob(imageGenerationPrompt: string): Promise<string> {
    const selectedModel = await d
      .ChatImageModelService(this.chatId)
      .getSelectedModelOrDefault();

    const modelInput = copyModel(selectedModel);

    appendPrompt(modelInput, imageGenerationPrompt);

    const response = await d.CivitJobAPI().generateImage(modelInput);
    return response?.jobs[0]?.jobId ?? "";
  }

  /**
   * Resolves the image generation prompt using the hierarchy:
   * 1. Selected model's imageGenerationPrompt (if set)
   * 2. System-level defaultImagePrompt (user-saved or built-in default)
   */
  private async resolveImageGenerationPrompt(): Promise<string> {
    const selectedModel = await d
      .ChatImageModelService(this.chatId)
      .getSelectedModelOrDefault();

    // Use model-specific prompt if set
    if (selectedModel.imageGenerationPrompt?.trim()) {
      return selectedModel.imageGenerationPrompt;
    }

    // Fall back to user-saved system prompt, then to the built-in default
    const systemPrompts = await d.SystemPromptsService().Get();
    return (
      systemPrompts?.defaultImagePrompt?.trim() ||
      DEFAULT_SYSTEM_PROMPTS.defaultImagePrompt
    );
  }

  /**
   * Resolves the LLM model for image prompt generation.
   */
  private async resolveImageModel(): Promise<string | undefined> {
    const systemPrompts = await d.SystemPromptsService().Get();
    return systemPrompts?.defaultImageModel || undefined;
  }

  private async resolveCharacterContextForLegacyFlow(): Promise<CharacterContext> {
    const context = await this.resolveCharacterContext();

    if (!isMissingDescriptionContext(context)) {
      return context;
    }

    await d
      .CharacterDescriptionsService(this.chatId)
      .createBlankCharacter(context.characterName);

    return noCharacterContext();
  }

  private selectCharacter = async (): Promise<string | null> =>
    await d.CharacterSelectionService(this.chatId).selectCharacterForImage();

  private findCharacterDescriptionRecord = async (
    name: string,
  ): Promise<CharacterDescription | undefined> =>
    await d.CharacterDescriptionsService(this.chatId).findByName(name);
}

const hasFeedback = (feedback?: string): boolean =>
  feedback !== undefined && feedback.trim().length > 0;

const noCharacterContext = (): CharacterContext => ({ type: "none" });

const isMissingDescriptionContext = (
  context: CharacterContext,
): context is { type: "missing-description"; characterName: string } =>
  context.type === "missing-description";

const isExistingDescriptionContext = (
  context: CharacterContext,
): context is {
  type: "existing-description";
  characterName: string;
  description: string;
} => context.type === "existing-description";

const toCharacterContextMessage = (
  context: CharacterContext,
): string | null => {
  if (!isExistingDescriptionContext(context)) {
    return null;
  }

  return formatCharacterContext(context.characterName, context.description);
};

const buildFeedbackMessage = (
  originalPrompt: string | undefined,
  feedback: string,
): string =>
  `The previous image prompt was: \n\n"${originalPrompt}" \n\nPlease regenerate with this feedback: \n\n${feedback}. \n\nRespond ONLY with the new image prompt separated by commas.`;

const appendPrompt = (modelInput: any, prompt: string) => {
  modelInput.params.prompt =
    (modelInput.params.prompt ? `${modelInput.params.prompt}, ` : "") + prompt;
};

const copyModel = (selectedModel: ImageModel) =>
  JSON.parse(JSON.stringify(selectedModel.input));

const buildPromptMessagesWithCharacter = (
  messages: LLMMessage[],
  characterDescription: string | null,
  imagePrompt: string,
): LLMMessage[] => {
  const promptMessages = [...messages];

  if (characterDescription) {
    promptMessages.push(toSystemMessage(characterDescription));
  }

  promptMessages.push(toSystemMessage(imagePrompt));

  return promptMessages;
};

const buildPromptMessagesWithCharacterAndFeedback = (
  messages: LLMMessage[],
  characterDescription: string | null,
  imagePrompt: string,
  feedbackMessage: string,
): LLMMessage[] => {
  const promptMessages = [...messages];

  if (characterDescription) {
    promptMessages.push(toSystemMessage(characterDescription));
  }

  promptMessages.push(toSystemMessage(imagePrompt));
  promptMessages.push(toSystemMessage(feedbackMessage));

  return promptMessages;
};

const formatCharacterContext = (
  characterName: string,
  description: string,
): string =>
  `# Character: ${characterName}\n\n${description}\n\nUse this character description as the basis for the person in the image.`;

const hasDescription = (description: string): boolean =>
  description.trim().length > 0;
