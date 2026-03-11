import type {
  ChatEvent,
  MessageCreatedEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  MessagesDeletedEvent,
  ChapterCreatedEvent,
  ChapterEditedEvent,
  ChapterDeletedEvent,
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

  // ---- Event Processing ----
  public process(event: ChatEvent) {
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

    this.notifySubscribers();
  }

  // ---- Retrieval ----
  public GetMessage(messageId: string): UserChatMessage | undefined {
    return this.Messages.find((m) => m.id === messageId);
  }

  public GetMessages(): UserChatMessage[] {
    return this.Messages.filter(
      (m) => !m.hiddenByChapterId && !m.deleted && !m.hidden,
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
    const story = this.Messages.find((m) => m.id === event.storyId);
    if (story) {
      story.content = event.content;
    }
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
    const msg = this.Messages.find((m) => m.id === event.messageId);
    if (msg) {
      msg.content = event.newContent;
    }
  }

  private processMessageDeleted(event: MessageDeletedEvent) {
    const msg = this.Messages.find((m) => m.id === event.messageId);
    if (msg) {
      msg.deleted = true;
    }
  }

  // ---- New batch deletion handler ----
  private processMessagesDeleted(event: MessagesDeletedEvent) {
    event.messageIds.forEach((id) => {
      const msg = this.Messages.find((m) => m.id === id);
      if (msg) msg.deleted = true;
    });
  }

  private processChapterCreated(event: ChapterCreatedEvent) {
    event.coveredMessageIds.forEach((id) => {
      const msg = this.Messages.find((m) => m.id === id);
      if (msg && this.isHideableByChapter(msg))
        msg.hiddenByChapterId = event.chapterId;
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
    const chapter = this.Messages.find(
      (m) => m.id === event.chapterId && m.type === "chapter",
    ) as ChapterChatMessage;
    if (chapter) {
      chapter.content = event.summary;
      chapter.data.title = event.title;
      chapter.data.nextChapterDirection = event.nextChapterDirection;
    }
  }

  private processChapterDeleted(event: ChapterDeletedEvent) {
    const chapter = this.Messages.find(
      (m) => m.id === event.chapterId && m.type === "chapter",
    ) as ChapterChatMessage;
    if (!chapter) return;

    if (chapter.data.coveredMessageIds) {
      chapter.data.coveredMessageIds.forEach((id: string) => {
        const msg = this.Messages.find((m) => m.id === id);
        if (msg) msg.hiddenByChapterId = undefined;
      });
    }

    chapter.deleted = true;
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
    this.Messages.filter(
      (m) =>
        m.type === "plan" &&
        m.data?.planDefinitionId === event.planDefinitionId,
    ).forEach((m) => {
      m.hidden = true;
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
    | "plan";

  content?: string; // Text-based content of the message

  data?: any; // Data specific to message type

  hiddenByChapterId: string | undefined;
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
