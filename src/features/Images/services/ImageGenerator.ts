import { d } from "../../../services/Dependencies";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import type { ImageModel } from "./modelGeneration/ImageModel";
import { toSystemMessage } from "../../../services/Utils/MessageUtils";

export class ImageGenerator {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  /**
   * Generates a scene description prompt using the selected model's prompt or the system default.
   */
  public async generatePrompt(messages: LLMMessage[]): Promise<string> {
    const imageGenerationPrompt = await this.resolveImageGenerationPrompt();
    const promptMessages = [
      ...messages,
      toSystemMessage(imageGenerationPrompt),
    ];

    return await d.OpenRouterChatAPI().postChat(promptMessages);
  }

  public async generatePromptWithFeedback(
    messages: LLMMessage[],
    originalPrompt?: string,
    feedback?: string,
  ): Promise<string> {
    if (!hasFeedback(feedback)) {
      return this.generatePrompt(messages);
    }

    const imageGenerationPrompt = await this.resolveImageGenerationPrompt();
    const feedbackMessage = buildFeedbackMessage(originalPrompt, feedback!);
    const promptMessages = [
      ...messages,
      toSystemMessage(imageGenerationPrompt),
      toSystemMessage(feedbackMessage),
    ];

    return await d.OpenRouterChatAPI().postChat(promptMessages);
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
   * 2. System-level defaultImagePrompt
   */
  private async resolveImageGenerationPrompt(): Promise<string> {
    const selectedModel = await d
      .ChatImageModelService(this.chatId)
      .getSelectedModelOrDefault();

    // Use model-specific prompt if set
    if (selectedModel.imageGenerationPrompt?.trim()) {
      return selectedModel.imageGenerationPrompt;
    }

    // Fall back to system default
    const systemPrompts = await d.SystemPromptsService().Get();
    if (systemPrompts?.defaultImagePrompt?.trim()) {
      return systemPrompts.defaultImagePrompt;
    }

    // Ultimate fallback to hardcoded default (shouldn't happen in practice)
    return DEFAULT_IMAGE_GENERATION_PROMPT;
  }
}

const DEFAULT_IMAGE_GENERATION_PROMPT = `Consider setting and the character present.

For each reply, include 3–5 words for:
- **Setting** (where the scene takes place)
- **Description of person involved** (appearance, clothing, notable traits)
- **Description of what they are doing** (their action or posture)

Respond with ONLY a detailed, comma separated list depicting the current characters for image generation purposes.
DEFAULT_SYSTEM_PROMPTS
Example:
"restaurant, evening, italian, woman, black dress, classy, sitting, touching face, at table, sitting in chair"`;

const hasFeedback = (feedback?: string): boolean =>
  feedback !== undefined && feedback.trim().length > 0;

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
