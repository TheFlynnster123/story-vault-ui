import type { Message } from "../Chat/ChatMessage";
import type { GrokChatAPI } from "../clients/GrokChatAPI";

/**
 * Abstract base class for all response notes.
 * Contains common functionality for generating content using the Grok API.
 */
export abstract class ResponseNote {
  protected content: string = "";
  protected loaded: boolean = false;
  protected grokClient: GrokChatAPI;

  constructor(grokClient: GrokChatAPI, initialContent: string = "") {
    this.grokClient = grokClient;
    this.content = initialContent;
  }

  /**
   * Get the unique identifier for this note type
   */
  abstract getNoteName(): string;

  /**
   * Get the context label for display purposes
   */
  abstract getContextLabel(): string;

  /**
   * Get the prompt template for generating content
   */
  abstract getGenerationPrompt(): string;

  /**
   * Get the current content of the note
   */
  getContent(): string {
    return this.content;
  }

  /**
   * Set the content of the note
   */
  setContent(content: string): void {
    this.content = content;
    this.loaded = true;
  }

  /**
   * Check if the note has existing content
   */
  hasContent(): boolean {
    return this.content.trim().length > 0;
  }

  /**
   * Check if the note has been loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Helper function to consolidate message list into one big system message
   */
  private consolidateMessages(messageList: Message[]): Message[] {
    if (messageList.length === 0) {
      return messageList;
    }

    const consolidatedContent = messageList
      .map((message) => {
        const roleLabel = message.role === "system" ? "System" : "User";
        return `${roleLabel}: \n(${message.content})`;
      })
      .join(", \n");

    const consolidatedMessage: Message = {
      id: `consolidated-${Date.now()}`,
      role: "system",
      content: consolidatedContent,
    };

    return [consolidatedMessage];
  }

  /**
   * Generate note content based on the conversation
   */
  async generate(
    messageList: Message[],
    consolidateMessageList: boolean = true
  ): Promise<void> {
    try {
      const prompt = this.getGenerationPrompt();

      const promptMessage: Message = {
        id: `${this.getNoteName()}-prompt-${Date.now()}`,
        role: "system",
        content: prompt,
      };

      // Use consolidated messages if requested
      const processedMessages = consolidateMessageList
        ? this.consolidateMessages(messageList)
        : messageList;

      const messagesWithPrompt = [...processedMessages, promptMessage];
      const newContent = await this.grokClient.postChat(
        messagesWithPrompt,
        "low"
      );

      this.content = newContent;
      this.loaded = true;
    } catch (error) {
      console.error(`Failed to generate ${this.getNoteName()} note:`, error);
      throw error;
    }
  }

  /**
   * Create a system message for appending to chat context
   */
  getContextMessage(): Message | null {
    if (!this.hasContent()) return null;

    return {
      id: `${this.getNoteName()}-context-${Date.now()}`,
      role: "system",
      content: `${this.getContextLabel()}:\n${this.content}`,
    };
  }

  /**
   * Append this note's context to a message list
   */
  appendToContext(messageList: Message[]): Message[] {
    const contextMessage = this.getContextMessage();
    if (contextMessage) {
      return [...messageList, contextMessage];
    }
    return messageList;
  }
}
