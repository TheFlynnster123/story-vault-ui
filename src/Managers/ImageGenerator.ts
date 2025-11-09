import { toSystemMessage } from "../utils/messageUtils";
import type { Message } from "../pages/Chat/ChatMessage";
import { ImageGenerationPrompt } from "../templates/ImageGenerationPromptTemplate";
import { d } from "../app/Dependencies/Dependencies";
import type { ImageModel } from "../app/ImageModels/ImageModel";

export class ImageGenerator {
  public async generatePrompt(messages: Message[]): Promise<string> {
    const promptMessages = [
      ...messages,
      toSystemMessage(ImageGenerationPrompt),
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

const appendPrompt = (modelInput: any, prompt: string) => {
  modelInput.params.prompt =
    (modelInput.params.prompt ? `${modelInput.params.prompt}, ` : "") + prompt;
};

const copyModel = (selectedModel: ImageModel) =>
  JSON.parse(JSON.stringify(selectedModel.input));
