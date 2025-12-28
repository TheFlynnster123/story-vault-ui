export type ChatEvent =
  | MessageCreatedEvent
  | MessageEditedEvent
  | MessageDeletedEvent
  | MessagesDeletedEvent
  | ChapterCreatedEvent
  | ChapterEditedEvent
  | ChapterDeletedEvent
  | CivitJobCreatedEvent
  | StoryCreatedEvent
  | StoryEditedEvent;

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
  nextChapterDirection?: string;
  coveredMessageIds: string[];
}

export interface ChapterEditedEvent {
  type: "ChapterEdited";
  chapterId: string;
  title: string;
  summary: string;
  nextChapterDirection?: string;
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

export interface StoryCreatedEvent {
  type: "StoryCreated";
  storyId: string;
  content: string;
}

export interface StoryEditedEvent {
  type: "StoryEdited";
  storyId: string;
  content: string;
}
