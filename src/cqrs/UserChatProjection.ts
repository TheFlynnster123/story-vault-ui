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
const userChatProjectionInstances = new Map<string, UserChatProjection>();

export const getUserChatProjectionInstance = (
  chatId: string | null
): UserChatProjection | null => {
  if (!chatId) return null;

  if (!userChatProjectionInstances.has(chatId))
    userChatProjectionInstances.set(chatId, new UserChatProjection());

  return userChatProjectionInstances.get(chatId)!;
};

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
    }

    this.notifySubscribers();
  }

  // ---- Retrieval ----
  public GetMessage(messageId: string): UserChatMessage | undefined {
    return this.Messages.find((m) => m.id === messageId);
  }

  public GetMessages(): UserChatMessage[] {
    return this.Messages.filter((m) => !m.hiddenByChapterId && !m.deleted);
  }

  public getChapterMessages(chapterId: string): UserChatMessage[] {
    const chapter = this.Messages.find(
      (m) => m.id === chapterId && m.type === "chapter"
    ) as ChapterChatMessage;

    if (!chapter || !chapter.data.coveredMessageIds) return [];

    return this.Messages.filter((m) =>
      chapter.data.coveredMessageIds!.includes(m.id)
    );
  }

  // ---- Event Handlers ----
  private processMessageCreated(event: MessageCreatedEvent) {
    this.Messages.push({
      id: event.messageId,
      type: toType(event.role),
      content: event.content,
      hiddenByChapterId: undefined,
      deleted: false,
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
      if (msg) msg.hiddenByChapterId = event.chapterId;
    });

    this.Messages.push({
      id: event.chapterId,
      type: "chapter",
      content: event.summary,
      hiddenByChapterId: undefined,
      deleted: false,
      data: { coveredMessageIds: [...event.coveredMessageIds] },
    });
  }

  private processChapterEdited(event: ChapterEditedEvent) {
    const chapter = this.Messages.find(
      (m) => m.id === event.chapterId && m.type === "chapter"
    );
    if (chapter) {
      chapter.content = event.summary;
    }
  }

  private processChapterDeleted(event: ChapterDeletedEvent) {
    const chapter = this.Messages.find(
      (m) => m.id === event.chapterId && m.type === "chapter"
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
    });
  }
}

// ---- Supporting Types ----
export interface UserChatMessage {
  id: string;
  type:
    | "user-message"
    | "system-message"
    | "assistant"
    | "civit-job"
    | "chapter";

  content?: string; // Text-based content of the message

  data?: any; // Data specific to message type

  hiddenByChapterId: string | undefined;
  deleted: boolean;
}

export interface CivitJobChatMessage extends UserChatMessage {
  data: { jobId: string; prompt: string };
}

export interface ChapterChatMessage extends UserChatMessage {
  data: { coveredMessageIds: string[] };
}

function toType(
  role: "assistant" | "user" | "system"
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
