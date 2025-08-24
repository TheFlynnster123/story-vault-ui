import { GrokChatAPI } from "../clients/GrokChatAPI";
import { CivitJobAPI } from "../clients/CivitJobAPI";
import type { ImageGenerationSettings } from "../models/ImageGenerationSettings";
import type { SystemSettings } from "../models/SystemSettings";
import { toSystemMessage } from "../utils/messageUtils";
import type { Message } from "../pages/Chat/ChatMessage";
import { ImageGenerationPrompt } from "../templates/ImageGenerationPromptTemplate";

export class ImageGenerator {
  public static DEFAULT_SETTINGS: ImageGenerationSettings = {
    model: "urn:air:sdxl:checkpoint:civitai:257749@290640",
    params: {
      prompt:
        "score_9, score_8_up, score_7_up, score_6_up, source_anime, <lora:tendertroupe_v0.1-pony:1.0>",
      negativePrompt:
        "text, text, logo, watermark, signature, letterbox, bad anatomy, missing limbs, missing fingers, deformed, cropped, lowres, bad anatomy, bad hands, jpeg artifacts",
      scheduler: "DPM2Karras",
      steps: 20,
      cfgScale: 7,
      width: 1024,
      height: 1024,
      clipSkip: 2,
    },
    additionalNetworks: {
      "urn:air:sdxl:lora:civitai:479176@532904": {
        strength: 1,
      },
    },
  };

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
    const originalSettings =
      this.systemSettings.imageGenerationSettings ||
      ImageGenerator.DEFAULT_SETTINGS;
    const settings = JSON.parse(JSON.stringify(originalSettings));

    settings.params.prompt =
      (settings.params.prompt ? `, ${settings.params.prompt}` : "") + prompt;

    const response = await new CivitJobAPI().generateImage(settings);
    return response.jobs[0].jobId;
  }
}
