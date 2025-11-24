export type ChatEvent =
  | MessageCreatedEvent
  | MessageEditedEvent
  | MessageDeletedEvent
  | MessagesDeletedEvent
  | ChapterCreatedEvent
  | ChapterEditedEvent
  | ChapterDeletedEvent
  | CivitJobCreatedEvent;

export interface MessageCreatedEvent {
  type: "MessageCreated";
  messageId: string;
  role: "assistant" | "user" | "system";
  content: string;
}

export interface MessageEditedEvent {
  type: "MessageEdited";
  messageId: string;
  newContent: string;
}

export interface MessageDeletedEvent {
  type: "MessageDeleted";
  messageId: string;
}

export interface MessagesDeletedEvent {
  type: "MessagesDeleted";
  messageIds: string[];
}

export interface ChapterCreatedEvent {
  type: "ChapterCreated";
  chapterId: string;
  title: string;
  summary: string;
  coveredMessageIds: string[];
}

export interface ChapterEditedEvent {
  type: "ChapterEdited";
  chapterId: string;
  title: string;
  summary: string;
}

export interface ChapterDeletedEvent {
  type: "ChapterDeleted";
  chapterId: string;
}

export interface CivitJobCreatedEvent {
  type: "CivitJobCreated";
  jobId: string;
  prompt: string;
}
