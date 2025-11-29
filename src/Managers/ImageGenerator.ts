import { ImageGenerationPrompt } from "../templates/ImageGenerationPromptTemplate";
import { d } from "../app/Dependencies/Dependencies";
import type { ImageModel } from "../app/ImageModels/ImageModel";
import type { LLMMessage } from "../cqrs/LLMChatProjection";
import { toSystemMessage } from "../utils/messageUtils";

export class ImageGenerator {
  public async generatePrompt(messages: LLMMessage[]): Promise<string> {
    const promptMessages = [
      ...messages,
      toSystemMessage(ImageGenerationPrompt),
    ];

    return await d.GrokChatAPI().postChat(promptMessages);
  }

  public async generatePromptWithFeedback(
    messages: LLMMessage[],
    originalPrompt?: string,
    feedback?: string
  ): Promise<string> {
    if (!hasFeedback(feedback)) {
      return this.generatePrompt(messages);
    }

    const feedbackMessage = buildFeedbackMessage(originalPrompt, feedback!);
    const promptMessages = [
      ...messages,
      toSystemMessage(ImageGenerationPrompt),
      toSystemMessage(feedbackMessage),
    ];

    return await d.GrokChatAPI().postChat(promptMessages);
  }

  public async triggerJob(imageGenerationPrompt: string): Promise<string> {
    const selectedModel = await d
      .ImageModelService()
      .getOrDefaultSelectedModel();

    const modelInput = copyModel(selectedModel);

    appendPrompt(modelInput, imageGenerationPrompt);

    const response = await d.CivitJobAPI().generateImage(modelInput);
    return response?.jobs[0]?.jobId ?? "";
  }
}

const hasFeedback = (feedback?: string): boolean =>
  feedback !== undefined && feedback.trim().length > 0;

const buildFeedbackMessage = (
  originalPrompt: string | undefined,
  feedback: string
): string =>
  `The previous image prompt was: \n\n"${originalPrompt}" \n\nPlease regenerate with this feedback: \n\n${feedback}. \n\nRespond ONLY with the new image prompt separated by commas.`;

const appendPrompt = (modelInput: any, prompt: string) => {
  modelInput.params.prompt =
    (modelInput.params.prompt ? `${modelInput.params.prompt}, ` : "") + prompt;
};

const copyModel = (selectedModel: ImageModel) =>
  JSON.parse(JSON.stringify(selectedModel.input));
