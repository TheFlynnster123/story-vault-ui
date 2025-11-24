import type {
  ChapterCreatedEvent,
  ChapterEditedEvent,
  ChapterDeletedEvent,
} from "./ChatEvent";

export class ChapterCreatedEventUtil {
  public static Create(
    title: string,
    summary: string,
    coveredMessageIds: string[],
    nextChapterDirection?: string
  ): ChapterCreatedEvent {
    return {
      type: "ChapterCreated",
      chapterId: this.generateChapterId(),
      title,
      summary,
      nextChapterDirection,
      coveredMessageIds,
    };
  }

  static generateChapterId(): string {
    return `chapter-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
  }
}

export class ChapterEditedEventUtil {
  public static Create(
    chapterId: string,
    title: string,
    summary: string,
    nextChapterDirection?: string
  ): ChapterEditedEvent {
    return {
      type: "ChapterEdited",
      chapterId,
      title,
      summary,
      nextChapterDirection,
    };
  }
}

export class ChapterDeletedEventUtil {
  public static Create(chapterId: string): ChapterDeletedEvent {
    return {
      type: "ChapterDeleted",
      chapterId,
    };
  }
}
