import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";

const instances = new Map<string, ImageGenerationService>();

export const getImageGenerationServiceInstance = (
  chatId: string | null,
): ImageGenerationService | null => {
  if (!chatId) return null;

  if (!instances.has(chatId))
    instances.set(chatId, new ImageGenerationService(chatId));

  return instances.get(chatId)!;
};

export class ImageGenerationService extends GenerationOrchestrator {
  private chatId: string;

  constructor(chatId: string) {
    super();
    this.chatId = chatId;
  }

  async generateImage(): Promise<void> {
    await this.orchestrate(async () => {
      this.setStatus("Generating image prompt...");
      const messageList = d.LLMChatProjection(this.chatId).GetMessages();
      const generatedPrompt = await d
        .ImageGenerator(this.chatId)
        .generatePrompt(messageList);

      this.setStatus("Triggering image generation...");
      const jobId = await d
        .ImageGenerator(this.chatId)
        .triggerJob(generatedPrompt);

      this.setStatus("Saving job...");
      await d.ChatService(this.chatId).CreateCivitJob(jobId, generatedPrompt);
    });
  }

  async regenerateImage(jobId: string, feedback?: string): Promise<void> {
    const message = d.UserChatProjection(this.chatId).GetMessage(jobId);

    if (!message || message.type !== "civit-job") {
      console.warn(`CivitJob with id ${jobId} not found`);
      return;
    }

    await this.orchestrate(async () => {
      const originalPrompt = message.data?.prompt;

      await d.ChatService(this.chatId).DeleteMessage(jobId);

      this.setStatus("Generating image prompt...");
      const messageList = d.LLMChatProjection(this.chatId).GetMessages();
      const generatedPrompt = await d
        .ImageGenerator(this.chatId)
        .generatePromptWithFeedback(messageList, originalPrompt, feedback);

      this.setStatus("Triggering image generation...");
      const newJobId = await d
        .ImageGenerator(this.chatId)
        .triggerJob(generatedPrompt);

      this.setStatus("Saving job...");
      await d
        .ChatService(this.chatId)
        .CreateCivitJob(newJobId, generatedPrompt);
    });
  }
}
