import { d } from "../Dependencies/Dependencies";

// Singleton instances
const chatGenerationInstances = new Map<string, ChatGeneration>();

export const getChatGenerationInstance = (
  chatId: string | null
): ChatGeneration | null => {
  if (!chatId) return null;

  if (!chatGenerationInstances.has(chatId))
    chatGenerationInstances.set(chatId, new ChatGeneration(chatId));

  return chatGenerationInstances.get(chatId)!;
};

export class ChatGeneration {
  public IsLoading: boolean = false;
  public Status?: string;

  private chatId: string;
  private subscribers = new Set<() => void>();

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  private setIsLoading = (isLoading: boolean) => {
    this.IsLoading = isLoading;
    this.notifySubscribers();
  };

  private setStatus = (status?: string) => {
    this.Status = status;
    this.notifySubscribers();
  };

  async generateResponse(): Promise<string | undefined> {
    const chatId = this.chatId;

    this.setIsLoading(true);

    try {
      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildGenerationRequestMessages();

      this.setStatus("Generating response...");
      const response = await d.GrokChatAPI().postChat(requestMessages);

      this.setStatus("Saving...");
      await d.ChatService(chatId).AddAssistantMessage(response);

      return response;
    } finally {
      this.setIsLoading(false);
      this.setStatus();
    }
  }

  async generateImage(): Promise<void> {
    this.setIsLoading(true);

    try {
      this.setStatus("Generating image prompt...");
      const messageList = d.LLMChatProjection(this.chatId).GetMessages();
      const generatedPrompt = await d
        .ImageGenerator()
        .generatePrompt(messageList);

      this.setStatus("Triggering image generation...");
      const jobId = await d.ImageGenerator().triggerJob(generatedPrompt);

      this.setStatus("Saving job...");
      await d.ChatService(this.chatId).CreateCivitJob(jobId, generatedPrompt);
    } catch (e) {
      d.ErrorService().log("Failed to generate image", e);
      throw e;
    } finally {
      this.setIsLoading(false);
      this.setStatus();
    }
  }

  async regenerateResponse(
    messageId: string,
    feedback?: string
  ): Promise<string | undefined> {
    const message = d.LLMChatProjection(this.chatId).GetMessage(messageId);

    if (!message) {
      console.warn(`Message with id ${messageId} not found`);
      return;
    }

    const chatId = this.chatId;

    this.setIsLoading(true);

    try {
      const originalContent = message.content;

      await d.ChatService(chatId).DeleteMessage(messageId);

      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildRegenerationRequestMessages(originalContent, feedback);

      this.setStatus("Generating response...");
      const response = await d.GrokChatAPI().postChat(requestMessages);

      this.setStatus("Saving....");
      await d.ChatService(chatId).AddAssistantMessage(response);

      return response;
    } finally {
      this.setIsLoading(false);
      this.setStatus();
    }
  }

  async generateChapterSummary(): Promise<string | undefined> {
    this.setIsLoading(true);

    try {
      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildChapterSummaryRequestMessages();

      this.setStatus("Generating chapter summary...");
      const summary = await d.GrokChatAPI().postChat(requestMessages);

      return summary;
    } catch (e) {
      d.ErrorService().log("Failed to generate chapter summary", e);
      throw e;
    } finally {
      this.setIsLoading(false);
      this.setStatus();
    }
  }

  async regenerateImage(jobId: string, feedback?: string): Promise<void> {
    const message = d.UserChatProjection(this.chatId).GetMessage(jobId);

    if (!message || message.type !== "civit-job") {
      console.warn(`CivitJob with id ${jobId} not found`);
      return;
    }

    this.setIsLoading(true);

    try {
      const originalPrompt = message.data?.prompt;

      await d.ChatService(this.chatId).DeleteMessage(jobId);

      this.setStatus("Generating image prompt...");
      const messageList = d.LLMChatProjection(this.chatId).GetMessages();
      const generatedPrompt = await d
        .ImageGenerator()
        .generatePromptWithFeedback(messageList, originalPrompt, feedback);

      this.setStatus("Triggering image generation...");
      const newJobId = await d.ImageGenerator().triggerJob(generatedPrompt);

      this.setStatus("Saving job...");
      await d
        .ChatService(this.chatId)
        .CreateCivitJob(newJobId, generatedPrompt);
    } catch (e) {
      d.ErrorService().log("Failed to regenerate image", e);
      throw e;
    } finally {
      this.setIsLoading(false);
      this.setStatus();
    }
  }
}
