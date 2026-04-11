import type {
  BookCreatedEvent,
  BookEditedEvent,
  BookDeletedEvent,
} from "./ChatEvent";

export class BookCreatedEventUtil {
  public static Create(
    title: string,
    summary: string,
    coveredChapterIds: string[],
  ): BookCreatedEvent {
    return {
      type: "BookCreated",
      bookId: this.generateBookId(),
      title,
      summary,
      coveredChapterIds,
    };
  }

  static generateBookId(): string {
    return `book-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export class BookEditedEventUtil {
  public static Create(
    bookId: string,
    title: string,
    summary: string,
  ): BookEditedEvent {
    return {
      type: "BookEdited",
      bookId,
      title,
      summary,
    };
  }
}

export class BookDeletedEventUtil {
  public static Create(bookId: string): BookDeletedEvent {
    return {
      type: "BookDeleted",
      bookId,
    };
  }
}
