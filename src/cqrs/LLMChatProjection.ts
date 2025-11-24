import type {
  ChatEvent,
  MessageCreatedEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  MessagesDeletedEvent,
  ChapterCreatedEvent,
  ChapterEditedEvent,
  ChapterDeletedEvent,
} from "./events/ChatEvent";

// Singleton instances
const llmChatProjectionInstances = new Map<string, LLMChatProjection>();

export const getLLMChatProjectionInstance = (
  chatId: string | null
): LLMChatProjection | null => {
  if (!chatId) return null;

  if (!llmChatProjectionInstances.has(chatId))
    llmChatProjectionInstances.set(chatId, new LLMChatProjection());

  return llmChatProjectionInstances.get(chatId)!;
};

// ---- LLM Chat Projection ----
export class LLMChatProjection {
  private messages: MessageState[] = [];
  private numberOfPreviousChapterMessages: number = 6;

  private subscribers = new Set<() => void>();

  constructor() {
    this.messages = [];
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  // ---- Event Processing ----
  public process(event: ChatEvent) {
    switch (event.type) {
      case "MessageCreated":
        this.processMessageCreated(event);
        break;
      case "MessageEdited":
        this.processMessageEdited(event);
        break;
      case "MessageDeleted":
        this.processMessageDeleted(event);
        break;
      case "MessagesDeleted":
        this.processMessagesDeleted(event);
        break;
      case "ChapterCreated":
        this.processChapterCreated(event);
        break;
      case "ChapterEdited":
        this.processChapterEdited(event);
        break;
      case "ChapterDeleted":
        this.processChapterDeleted(event);
        break;
      case "CivitJobCreated":
        return;
    }

    this.notifySubscribers();
  }

  // ---- LLM Message Retrieval ----
  public GetMessages(): LLMMessage[] {
    const visibleMessages = this.getVisibleMessages();
    const lastChapter = this.getLastChapter();
    if (!lastChapter) return visibleMessages.map((m) => this.toLLMMessage(m));

    const messagesSinceChapter = visibleMessages.filter(
      (m) => this.getMessageIndex(m.id) > this.getMessageIndex(lastChapter.id)
    );

    if (messagesSinceChapter.length >= this.numberOfPreviousChapterMessages) {
      return visibleMessages.map((m) => this.toLLMMessage(m));
    }

    const bufferMessages = this.getPreviousChapterBuffer(lastChapter);
    return [
      ...bufferMessages.map((m) => this.toLLMMessage(m)),
      ...visibleMessages.map((m) => this.toLLMMessage(m)),
    ];
  }

  public GetMessage(id: string): LLMMessage | null {
    const msg = this.getMessage(id);

    if (!msg || msg.deleted) return null;
    return this.toLLMMessage(msg);
  }

  // ---- Event Handlers ----
  private processMessageCreated(event: MessageCreatedEvent) {
    this.messages.push(
      this.createMessageState(event.messageId, event.role, event.content)
    );

    // Update last chapter format based on message count
    this.updateLastChapterFormat();
  }

  private processMessageEdited(event: MessageEditedEvent) {
    const msg = this.getMessage(event.messageId);
    if (msg && !msg.deleted) msg.content = event.newContent;
  }

  private processMessageDeleted(event: MessageDeletedEvent) {
    const msg = this.getMessage(event.messageId);
    if (msg) msg.deleted = true;
  }

  private processMessagesDeleted(event: MessagesDeletedEvent) {
    event.messageIds.forEach((id) => {
      const msg = this.getMessage(id);
      if (msg) msg.deleted = true;
    });
  }

  private processChapterCreated(event: ChapterCreatedEvent) {
    // Mark covered messages as hidden
    event.coveredMessageIds.forEach((id) => {
      const msg = this.getMessage(id);
      if (msg) msg.hiddenByChapterId = event.chapterId;
    });

    // Downgrade previous last chapter to simple format (if exists)
    const previousLastChapter = this.getLastChapter();
    if (previousLastChapter?.data) {
      const { title, summary } = previousLastChapter.data;
      this.updateChapterToSimpleFormat(previousLastChapter.id, title, summary);
    }

    // Create new chapter with full format (since it's now the last chapter)
    const chapterContent = this.formatChapterContentFull(
      event.title,
      event.summary,
      event.nextChapterDirection,
      event.coveredMessageIds
    );

    const chapterMessage = this.createMessageState(
      event.chapterId,
      "system",
      chapterContent,
      event.coveredMessageIds
    );

    // Store metadata for future format updates
    chapterMessage.data = {
      title: event.title,
      summary: event.summary,
      nextChapterDirection: event.nextChapterDirection,
    };

    this.messages.push(chapterMessage);
  }

  private processChapterEdited(event: ChapterEditedEvent) {
    const chapter = this.getMessage(event.chapterId);
    if (!chapter || !chapter.coveredMessageIds) return;

    // Update metadata
    chapter.data = {
      title: event.title,
      summary: event.summary,
      nextChapterDirection: event.nextChapterDirection,
    };

    // Determine if this is the last chapter
    const isLastChapter = this.getLastChapter()?.id === event.chapterId;

    if (isLastChapter) {
      // Use full format for last chapter
      this.updateChapterToFullFormat(
        event.chapterId,
        event.title,
        event.summary,
        event.nextChapterDirection,
        chapter.coveredMessageIds
      );
    } else {
      // Use simple format for previous chapters
      this.updateChapterToSimpleFormat(
        event.chapterId,
        event.title,
        event.summary
      );
    }
  }

  private processChapterDeleted(event: ChapterDeletedEvent) {
    const chapter = this.getMessage(event.chapterId);
    if (!chapter) return;

    chapter.coveredMessageIds?.forEach((id) => {
      const msg = this.getMessage(id);
      if (msg) msg.hiddenByChapterId = null;
    });

    chapter.deleted = true;
  }

  // ---- Helpers ----
  private getMessage(id: string): MessageState | undefined {
    return this.messages.find((m) => m.id === id);
  }

  private getMessageIndex(id: string): number {
    return this.messages.findIndex((m) => m.id === id);
  }

  private getVisibleMessages(): MessageState[] {
    return this.messages.filter((m) => !m.hiddenByChapterId && !m.deleted);
  }

  private getLastChapter(): MessageState | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const m = this.messages[i];
      if (m.role === "system" && m.coveredMessageIds) return m;
    }
    return null;
  }

  private getPreviousChapterBuffer(lastChapter: MessageState): MessageState[] {
    if (!lastChapter.coveredMessageIds) return [];
    const bufferIds = lastChapter.coveredMessageIds.slice(
      -this.numberOfPreviousChapterMessages
    );
    return bufferIds
      .map((id) => this.getMessage(id))
      .filter(Boolean) as MessageState[];
  }

  private formatChapterContentSimple(title: string, summary: string): string {
    return `[Previous Chapter Summary: ${title}]\n${summary}\n[End of Chapter Summary]`;
  }

  private formatChapterContentWithDirection(
    title: string,
    summary: string,
    nextChapterDirection: string | undefined
  ): string {
    let content = `[Previous Chapter Summary: ${title}]\n${summary}\n[End of Chapter Summary]`;

    if (nextChapterDirection?.trim()) {
      content += `\n[Directions for continuing the story:]\n${nextChapterDirection}\n`;
    }

    return content;
  }

  private formatChapterContentFull(
    title: string,
    summary: string,
    nextChapterDirection: string | undefined,
    coveredMessageIds: string[]
  ): string {
    const lastSixMessages = this.getLastSixChapterMessages(coveredMessageIds);

    let content = "";

    if (lastSixMessages.length > 0) {
      content += "[Previous Chapter Final Messages]\n";
      content += lastSixMessages.map((msg) => msg.content).join("\n");
      content += "\n";
    }

    content += `[Previous Chapter Summary: ${title}]\n${summary}\n[End of Chapter Summary]`;

    if (nextChapterDirection?.trim()) {
      content += `\n[Directions for continuing the story:]\n${nextChapterDirection}\n`;
    }

    return content;
  }

  private getLastSixChapterMessages(
    coveredMessageIds: string[]
  ): MessageState[] {
    const lastSixIds = coveredMessageIds.slice(-6);
    return lastSixIds
      .map((id) => this.getMessage(id))
      .filter((msg): msg is MessageState => msg !== undefined && !msg.deleted);
  }

  private updateChapterToSimpleFormat(
    chapterId: string,
    title: string,
    summary: string
  ): void {
    const chapter = this.getMessage(chapterId);
    if (!chapter) return;
    chapter.content = this.formatChapterContentSimple(title, summary);
  }

  private updateChapterToFullFormat(
    chapterId: string,
    title: string,
    summary: string,
    nextChapterDirection: string | undefined,
    coveredMessageIds: string[]
  ): void {
    const chapter = this.getMessage(chapterId);
    if (!chapter) return;
    chapter.content = this.formatChapterContentFull(
      title,
      summary,
      nextChapterDirection,
      coveredMessageIds
    );
  }

  private updateLastChapterFormat(): void {
    const lastChapter = this.getLastChapter();
    if (!lastChapter?.data || !lastChapter.coveredMessageIds) return;

    const { title, summary, nextChapterDirection } = lastChapter.data;

    // Count visible messages after the last chapter
    const chapterIndex = this.getMessageIndex(lastChapter.id);
    const messagesAfterChapter = this.getVisibleMessages().filter(
      (m) => this.getMessageIndex(m.id) > chapterIndex
    );

    // If we have 6 or more messages after chapter, don't include covered messages
    // but still include the direction if it exists
    if (messagesAfterChapter.length >= this.numberOfPreviousChapterMessages) {
      const chapter = this.getMessage(lastChapter.id);
      if (chapter) {
        chapter.content = this.formatChapterContentWithDirection(
          title,
          summary,
          nextChapterDirection
        );
      }
    } else {
      // Use full format with last 6 covered messages
      this.updateChapterToFullFormat(
        lastChapter.id,
        title,
        summary,
        nextChapterDirection,
        lastChapter.coveredMessageIds
      );
    }
  }

  private createMessageState(
    id: string,
    role: "user" | "assistant" | "system",
    content: string,
    coveredMessageIds?: string[]
  ): MessageState {
    return {
      id,
      role,
      content,
      hiddenByChapterId: null,
      deleted: false,
      coveredMessageIds,
    };
  }

  private toLLMMessage(state: MessageState): LLMMessage {
    return {
      role: state.role as "user" | "assistant" | "system",
      content: state.content,
    };
  }
}

// ---- Types ----
interface MessageState {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  hiddenByChapterId: string | null;
  deleted: boolean;
  coveredMessageIds?: string[] | null;
  // Store chapter metadata for format updates
  data?: {
    title: string;
    summary: string;
    nextChapterDirection?: string;
  };
}

export interface LLMMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
}
