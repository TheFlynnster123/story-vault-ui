import type {
  ChatEvent,
  MessageCreatedEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  MessagesDeletedEvent,
  ChapterCreatedEvent,
  ChapterEditedEvent,
  ChapterDeletedEvent,
  BookCreatedEvent,
  BookEditedEvent,
  BookDeletedEvent,
  StoryCreatedEvent,
  StoryEditedEvent,
  PlanCreatedEvent,
  PlanHiddenEvent,
} from "./events/ChatEvent";

import { createInstanceCache } from "../Utils/getOrCreateInstance";

export const getUserChatProjectionInstance = createInstanceCache(
  (_chatId: string) => new UserChatProjection(),
);

export class UserChatProjection {
  public Messages: UserChatMessage[] = [];

  private subscribers = new Set<() => void>();

  constructor() {
    this.Messages = [];
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  // ---- Streaming Support ----
  private streamingMessageId: string | null = null;
  private isStreamingNewMessage: boolean = false;

  public addStreamingMessage(id: string): void {
    this.streamingMessageId = id;
    this.isStreamingNewMessage = true;
    this.Messages.push({
      id,
      type: "assistant",
      content: "",
      hiddenByChapterId: undefined,
      deleted: false,
      hidden: false,
    });
    this.notifySubscribers();
  }

  /**
   * Streams into an existing message in-place (used for regeneration).
   * The message stays at its current position in the list instead of
   * appearing at the bottom.
   */
  public startStreamingExistingMessage(id: string): void {
    this.streamingMessageId = id;
    this.isStreamingNewMessage = false;
    this.replaceMessage(id, { content: "" });
    this.notifySubscribers();
  }

  public updateStreamingMessage(content: string): void {
    if (!this.streamingMessageId) return;
    this.replaceMessage(this.streamingMessageId, { content });
    this.notifySubscribers();
  }

  public removeStreamingMessage(): void {
    if (!this.streamingMessageId) return;

    if (this.isStreamingNewMessage) {
      const index = this.Messages.findIndex(
        (m) => m.id === this.streamingMessageId,
      );
      if (index !== -1) {
        this.Messages.splice(index, 1);
      }
    }

    this.streamingMessageId = null;
    this.isStreamingNewMessage = false;
    this.notifySubscribers();
  }

  // ---- Event Processing ----
  public process(event: ChatEvent) {
    this.applyEvent(event);
    this.notifySubscribers();
  }

  public processBatch(events: ChatEvent[]) {
    for (const event of events) {
      this.applyEvent(event);
    }
    this.notifySubscribers();
  }

  private applyEvent(event: ChatEvent) {
    switch (event.type) {
      case "StoryCreated":
        this.processStoryCreated(event);
        break;
      case "StoryEdited":
        this.processStoryEdited(event);
        break;
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
      case "BookCreated":
        this.processBookCreated(event);
        break;
      case "BookEdited":
        this.processBookEdited(event);
        break;
      case "BookDeleted":
        this.processBookDeleted(event);
        break;
      case "CivitJobCreated":
        this.processCivitJobCreated(event);
        break;
      case "PlanCreated":
        this.processPlanCreated(event);
        break;
      case "PlanHidden":
        this.processPlanHidden(event);
        break;
    }
  }

  // ---- Retrieval ----
  public GetMessage(messageId: string): UserChatMessage | undefined {
    return this.Messages.find((m) => m.id === messageId);
  }

  public GetMessages(): UserChatMessage[] {
    return this.Messages.filter(
      (m) =>
        !m.hiddenByChapterId && !m.hiddenByBookId && !m.deleted && !m.hidden,
    );
  }

  public getChapterMessages(chapterId: string): UserChatMessage[] {
    const chapter = this.Messages.find(
      (m) => m.id === chapterId && m.type === "chapter",
    ) as ChapterChatMessage;

    if (!chapter || !chapter.data.coveredMessageIds) return [];

    return this.Messages.filter((m) =>
      chapter.data.coveredMessageIds!.includes(m.id),
    );
  }

  public getBookChapters(bookId: string): UserChatMessage[] {
    const book = this.Messages.find(
      (m) => m.id === bookId && m.type === "book",
    ) as BookChatMessage;

    if (!book || !book.data.coveredChapterIds) return [];

    return this.Messages.filter((m) =>
      book.data.coveredChapterIds!.includes(m.id),
    );
  }

  // ---- Event Handlers ----
  private processStoryCreated(event: StoryCreatedEvent) {
    this.Messages.unshift({
      id: event.storyId,
      type: "story",
      content: event.content,
      hiddenByChapterId: undefined,
      deleted: false,
      hidden: false,
    });
  }

  private processStoryEdited(event: StoryEditedEvent) {
    this.replaceMessage(event.storyId, { content: event.content });
  }

  private processMessageCreated(event: MessageCreatedEvent) {
    this.Messages.push({
      id: event.messageId,
      type: toType(event.role),
      content: event.content,
      hiddenByChapterId: undefined,
      deleted: false,
      hidden: false,
    });
  }

  private processMessageEdited(event: MessageEditedEvent) {
    this.replaceMessage(event.messageId, { content: event.newContent });
  }

  private processMessageDeleted(event: MessageDeletedEvent) {
    this.replaceMessage(event.messageId, { deleted: true });
  }

  // ---- New batch deletion handler ----
  private processMessagesDeleted(event: MessagesDeletedEvent) {
    event.messageIds.forEach((id) => {
      this.replaceMessage(id, { deleted: true });
    });
  }

  private processChapterCreated(event: ChapterCreatedEvent) {
    event.coveredMessageIds.forEach((id) => {
      const index = this.Messages.findIndex((m) => m.id === id);
      if (index !== -1 && this.isHideableByChapter(this.Messages[index]))
        this.Messages[index] = {
          ...this.Messages[index],
          hiddenByChapterId: event.chapterId,
        };
    });

    this.Messages.push({
      id: event.chapterId,
      type: "chapter",
      content: event.summary,
      hiddenByChapterId: undefined,
      deleted: false,
      hidden: false,
      data: {
        title: event.title,
        nextChapterDirection: event.nextChapterDirection,
        coveredMessageIds: [...event.coveredMessageIds],
      },
    });
  }

  private processChapterEdited(event: ChapterEditedEvent) {
    const index = this.Messages.findIndex(
      (m) => m.id === event.chapterId && m.type === "chapter",
    );
    if (index !== -1) {
      const chapter = this.Messages[index] as ChapterChatMessage;
      this.Messages[index] = {
        ...chapter,
        content: event.summary,
        data: {
          ...chapter.data,
          title: event.title,
          nextChapterDirection: event.nextChapterDirection,
        },
      };
    }
  }

  private processChapterDeleted(event: ChapterDeletedEvent) {
    const chapterIndex = this.Messages.findIndex(
      (m) => m.id === event.chapterId && m.type === "chapter",
    );
    if (chapterIndex === -1) return;

    const chapter = this.Messages[chapterIndex] as ChapterChatMessage;

    if (chapter.data.coveredMessageIds) {
      chapter.data.coveredMessageIds.forEach((id: string) => {
        this.replaceMessage(id, { hiddenByChapterId: undefined });
      });
    }

    this.Messages[chapterIndex] = { ...chapter, deleted: true };
  }

  private processBookCreated(event: BookCreatedEvent) {
    event.coveredChapterIds.forEach((id) => {
      const index = this.Messages.findIndex(
        (m) => m.id === id && m.type === "chapter",
      );
      if (index !== -1) {
        this.Messages[index] = {
          ...this.Messages[index],
          hiddenByBookId: event.bookId,
        };
      }
    });

    this.Messages.push({
      id: event.bookId,
      type: "book",
      content: event.summary,
      hiddenByChapterId: undefined,
      hiddenByBookId: undefined,
      deleted: false,
      hidden: false,
      data: {
        title: event.title,
        coveredChapterIds: [...event.coveredChapterIds],
      },
    });
  }

  private processBookEdited(event: BookEditedEvent) {
    const index = this.Messages.findIndex(
      (m) => m.id === event.bookId && m.type === "book",
    );
    if (index !== -1) {
      const book = this.Messages[index] as BookChatMessage;
      this.Messages[index] = {
        ...book,
        content: event.summary,
        data: {
          ...book.data,
          title: event.title,
        },
      };
    }
  }

  private processBookDeleted(event: BookDeletedEvent) {
    const bookIndex = this.Messages.findIndex(
      (m) => m.id === event.bookId && m.type === "book",
    );
    if (bookIndex === -1) return;

    const book = this.Messages[bookIndex] as BookChatMessage;

    if (book.data.coveredChapterIds) {
      book.data.coveredChapterIds.forEach((id: string) => {
        this.replaceMessage(id, { hiddenByBookId: undefined });
      });
    }

    this.Messages[bookIndex] = { ...book, deleted: true };
  }

  private processCivitJobCreated(event: { jobId: string; prompt: string }) {
    this.Messages.push({
      id: event.jobId,
      type: "civit-job",
      data: { jobId: event.jobId, prompt: event.prompt },

      hiddenByChapterId: undefined,
      deleted: false,
      hidden: false,
    });
  }

  /**
   * Adds a plan message to the chat timeline.
   * Plan messages appear as distinct entries with a teal theme.
   */
  private processPlanCreated(event: PlanCreatedEvent) {
    this.Messages.push({
      id: event.messageId,
      type: "plan",
      content: event.content,
      data: {
        planDefinitionId: event.planDefinitionId,
        planName: event.planName,
      },
      hiddenByChapterId: undefined,
      deleted: false,
      hidden: false,
    });
  }

  /**
   * Hides all existing plan messages for a given plan definition.
   * Called before creating a new plan instance so only the latest is visible.
   * Uses `hidden` (not `deleted`) to preserve event history.
   */
  private processPlanHidden(event: PlanHiddenEvent) {
    this.Messages.forEach((m, index) => {
      if (
        m.type === "plan" &&
        m.data?.planDefinitionId === event.planDefinitionId
      ) {
        this.Messages[index] = { ...m, hidden: true };
      }
    });
  }

  private static HIDEABLE_TYPES: ReadonlySet<string> = new Set([
    "user-message",
    "system-message",
    "assistant",
    "civit-job",
    "story",
  ]);

  private isHideableByChapter = (msg: UserChatMessage): boolean =>
    UserChatProjection.HIDEABLE_TYPES.has(msg.type);

  /**
   * Replaces a message in the array with a new object containing the updates.
   * Creates a new object reference so React.memo detects the change.
   */
  private replaceMessage(id: string, updates: Partial<UserChatMessage>): void {
    const index = this.Messages.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.Messages[index] = { ...this.Messages[index], ...updates };
    }
  }
}

// ---- Supporting Types ----
export interface UserChatMessage {
  id: string;
  type:
    | "story"
    | "user-message"
    | "system-message"
    | "assistant"
    | "civit-job"
    | "chapter"
    | "book"
    | "plan"
    | "chainOfThought";

  content?: string; // Text-based content of the message

  data?: any; // Data specific to message type

  hiddenByChapterId: string | undefined;

  /** When set, the message is hidden because it's covered by a book */
  hiddenByBookId?: string | undefined;

  deleted: boolean;

  /**
   * When true, the message is hidden from the UI and LLM context.
   * Used by plan messages: when a new plan instance is generated,
   * prior instances for the same plan definition are hidden.
   * Distinct from `deleted` (permanent removal) and `hiddenByChapterId`
   * (chapter-based covering of older messages).
   */
  hidden: boolean;
}

export interface CivitJobChatMessage extends UserChatMessage {
  data: { jobId: string; prompt: string };
}

export interface ChapterChatMessage extends UserChatMessage {
  data: {
    title: string;
    nextChapterDirection?: string;
    coveredMessageIds: string[];
  };
}

export interface StoryChatMessage extends UserChatMessage {
  type: "story";
  content: string;
}

export interface PlanChatMessage extends UserChatMessage {
  type: "plan";
  content: string;
  data: {
    planDefinitionId: string;
    planName: string;
  };
}

export interface BookChatMessage extends UserChatMessage {
  type: "book";
  content: string;
  data: {
    title: string;
    coveredChapterIds: string[];
  };
}

function toType(
  role: "assistant" | "user" | "system",
): "chapter" | "assistant" | "user-message" | "system-message" | "civit-job" {
  switch (role) {
    case "assistant":
      return "assistant";
    case "user":
      return "user-message";
    case "system":
      return "system-message";
    default:
      throw new Error(`Unknown role: ${role}`);
  }
}
