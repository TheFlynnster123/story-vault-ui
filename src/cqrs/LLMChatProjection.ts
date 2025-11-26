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
    const lastChapter = this.getLastChapter();
    if (!lastChapter) return this.getVisibleMessages();

    const messagesSinceChapter = this.getMessagesSinceChapter(lastChapter);

    if (!this.shouldIncludePreviousChapterBuffer(messagesSinceChapter)) {
      return [
        ...this.getPreviousChapterBufferMessages(lastChapter),
        ...this.getVisibleMessages(),
      ];
    }

    return this.getVisibleMessages();
  }

  public GetMessage(id: string): LLMMessage | null {
    const msg = this.getMessage(id);

    if (!msg || msg.deleted) return null;
    return msg;
  }

  // ---- Event Handlers ----
  processMessageCreated(event: MessageCreatedEvent) {
    this.messages.push(
      this.createMessageState(
        event.messageId,
        "message",
        event.role,
        event.content
      )
    );

    this.updateLastChapterFormat();
  }

  processMessageEdited(event: MessageEditedEvent) {
    const msg = this.getMessage(event.messageId);
    if (msg && !msg.deleted) msg.content = event.newContent;
  }

  processMessageDeleted(event: MessageDeletedEvent) {
    const msg = this.getMessage(event.messageId);
    if (msg) msg.deleted = true;
  }

  processMessagesDeleted(event: MessagesDeletedEvent) {
    event.messageIds.forEach((id) => {
      const msg = this.getMessage(id);
      if (msg) msg.deleted = true;
    });
  }

  processChapterCreated(event: ChapterCreatedEvent) {
    this.hideMessages(event.chapterId, event.coveredMessageIds);

    const previousLastChapter = this.getLastChapter();
    if (!!previousLastChapter)
      this.updateChapterToSimpleFormat(previousLastChapter.id);

    const chapterContent = this.formatChapterContentFull(
      event.title,
      event.summary,
      event.nextChapterDirection
    );

    const chapterMessage = this.createMessageState(
      event.chapterId,
      "chapter",
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

  hideMessages(chapterId: string, messageIds: string[]) {
    messageIds.forEach((id) => {
      const msg = this.getMessage(id);
      if (msg) msg.hiddenByChapterId = chapterId;
    });
  }

  processChapterEdited(event: ChapterEditedEvent) {
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
      this.updateChapterToFullFormat(event.chapterId);
    } else {
      this.updateChapterToSimpleFormat(event.chapterId);
    }
  }

  processChapterDeleted(event: ChapterDeletedEvent) {
    const chapter = this.getMessage(event.chapterId);
    if (!chapter) return;

    chapter.coveredMessageIds?.forEach((id) => {
      const msg = this.getMessage(id);
      if (msg) msg.hiddenByChapterId = null;
    });

    chapter.deleted = true;
  }

  // ---- Helpers ----
  getMessagesSinceChapter = (lastChapter: MessageState) =>
    this.getVisibleMessages().filter(
      (m) => this.getMessageIndex(m.id) > this.getMessageIndex(lastChapter.id)
    );

  getVisibleChapterMessages = (chapter: MessageState) => {
    if (!chapter.coveredMessageIds) return [];
    return chapter.coveredMessageIds
      .map((id) => this.getMessage(id))
      .filter((msg) => msg !== undefined && !msg.deleted) as MessageState[];
  };

  shouldIncludePreviousChapterBuffer = (messagesSinceChapter: MessageState[]) =>
    messagesSinceChapter.length >= this.numberOfPreviousChapterMessages;

  getMessage = (id: string): MessageState | undefined =>
    this.messages.find((m) => m.id === id);

  getMessageIndex = (id: string): number =>
    this.messages.findIndex((m) => m.id === id);

  getVisibleMessages = (): MessageState[] =>
    this.messages.filter((m) => !m.hiddenByChapterId && !m.deleted);

  getLastChapter(): MessageState | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const m = this.messages[i];
      if (m.type === "chapter") return m;
    }

    return null;
  }

  getPreviousChapterBufferMessages(lastChapter: MessageState): MessageState[] {
    if (!lastChapter.coveredMessageIds) return [];
    const bufferIds = lastChapter.coveredMessageIds.slice(
      -this.numberOfPreviousChapterMessages
    );

    return bufferIds
      .map((id) => this.getMessage(id))
      .filter(Boolean) as MessageState[];
  }

  formatChapterContentSimple = (title?: string, summary?: string): string =>
    `[Previous Chapter Summary: ${title ?? ""}]\n${
      summary ?? ""
    }\n[End of Chapter Summary]`;

  formatChapterContentWithDirection = (
    title: string,
    summary: string,
    nextChapterDirection: string | undefined
  ): string => {
    let content = `[Previous Chapter Summary: ${title}]\n${summary}\n[End of Chapter Summary]`;

    if (nextChapterDirection?.trim())
      content += `\n[Directions for continuing the story:]\n${nextChapterDirection}\n`;

    return content;
  };

  formatChapterContentFull = (
    title?: string,
    summary?: string,
    nextChapterDirection?: string
  ): string => {
    let content = "";

    content += `[Previous Chapter Summary: ${title ?? ""}]\n${
      summary ?? ""
    }\n[End of Chapter Summary]`;

    if (nextChapterDirection?.trim())
      content += `\n[Directions for continuing the story:]\n${nextChapterDirection}\n`;

    return content;
  };

  getLastSixChapterMessages(coveredMessageIds: string[]): MessageState[] {
    const validMessages = coveredMessageIds
      .map((id) => this.getMessage(id))
      .filter((msg): msg is MessageState => msg !== undefined && !msg.deleted);

    return validMessages.slice(-6);
  }

  updateChapterToSimpleFormat(chapterId: string): void {
    const chapter = this.getMessage(chapterId);
    if (!chapter) return;

    const { title, summary } = chapter?.data || {};

    chapter.content = this.formatChapterContentSimple(title, summary);
  }

  updateChapterToFullFormat(chapterId: string): void {
    const chapter = this.getMessage(chapterId);
    if (!chapter) return;

    const { title, summary, nextChapterDirection } = chapter.data || {};
    chapter.content = this.formatChapterContentFull(
      title,
      summary,
      nextChapterDirection
    );
  }

  updateLastChapterFormat(): void {
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
      this.updateChapterToFullFormat(lastChapter.id);
    }
  }

  createMessageState(
    id: string,
    type: "message" | "chapter",
    role: "user" | "assistant" | "system",
    content: string,
    coveredMessageIds?: string[]
  ): MessageState {
    return {
      id,
      type,
      role,
      content,
      hiddenByChapterId: null,
      deleted: false,
      coveredMessageIds,
    };
  }
}

// ---- Types ----
interface MessageState {
  id: string;
  type: "message" | "chapter";
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
