import { GrokChatAPI } from "../clients/GrokChatAPI";
import { CivitJobAPI } from "../clients/CivitJobAPI";
import type { SystemSettings } from "../models/SystemSettings";
import type { ImageModel } from "../app/ImageModels/ImageModel";
import { toSystemMessage } from "../utils/messageUtils";
import type { Message } from "../pages/Chat/ChatMessage";
import { ImageGenerationPrompt } from "../templates/ImageGenerationPromptTemplate";
import { d } from "../app/Dependencies/Dependencies";

export class ImageGenerator {
  private systemSettings: SystemSettings;

  constructor(systemSettings: SystemSettings) {
    this.systemSettings = systemSettings;
  }

  public async generatePrompt(messages: Message[]): Promise<string> {
    const promptMessages = [
      ...messages,
      toSystemMessage(ImageGenerationPrompt),
    ];

    return await new GrokChatAPI(this.systemSettings).postChat(promptMessages);
  }

  public async triggerJob(prompt: string): Promise<string> {
    // Get the selected image model from ImageModelService
    const imageModelService = d.ImageModelService();
    const userImageModels = await imageModelService.GetAllImageModels();

    let selectedModel: ImageModel | null = null;
    if (userImageModels.selectedModelId) {
      selectedModel =
        userImageModels.models.find(
          (model) => model.id === userImageModels.selectedModelId
        ) || null;
    }

    // If no selected model, use the first available model or create a default
    if (!selectedModel) {
      selectedModel =
        userImageModels.models[0] || this.createDefaultImageModel();
    }

    // Create a copy of the model input and modify the prompt
    const modelInput = JSON.parse(JSON.stringify(selectedModel.input));
    modelInput.params.prompt =
      (modelInput.params.prompt ? `${modelInput.params.prompt}, ` : "") +
      prompt;

    const response = await new CivitJobAPI().generateImage(modelInput);
    return response.jobs[0].jobId;
  }

  private createDefaultImageModel(): ImageModel {
    return {
      id: "default-image-model",
      name: "Default Image Model",
      timestampUtcMs: Date.now(),
      input: {
        model: "urn:air:sdxl:checkpoint:civitai:257749@290640",
        params: {
          prompt: "score_9, score_8_up, score_7_up, score_6_up, source_anime",
          negativePrompt:
            "text, logo, watermark, signature, letterbox, bad anatomy, missing limbs, missing fingers, deformed, cropped, lowres, bad hands, jpeg artifacts",
          scheduler: "DPM2Karras",
          steps: 20,
          cfgScale: 7,
          width: 1024,
          height: 1024,
          clipSkip: 2,
        },
        additionalNetworks: {},
      },
    };
  }
}
