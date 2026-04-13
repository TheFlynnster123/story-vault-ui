import type { NoteCreatedEvent, NoteEditedEvent } from "./ChatEvent";

export class NoteCreatedEventUtil {
  public static Create(
    content: string,
    expiresAfterMessages: number | null,
  ): NoteCreatedEvent {
    return {
      type: "NoteCreated",
      noteId: this.generateNoteId(),
      content,
      expiresAfterMessages,
    };
  }

  private static generateNoteId(): string {
    return `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export class NoteEditedEventUtil {
  public static Create(
    noteId: string,
    content: string,
    expiresAfterMessages: number | null,
  ): NoteEditedEvent {
    return {
      type: "NoteEdited",
      noteId,
      content,
      expiresAfterMessages,
    };
  }
}
