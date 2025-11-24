import type { Message } from "./Messages";

export interface ChapterMessageContent {
  description: string;
  keepLastNMessages: number;
  timestamp: number;
}

export interface ChapterEditMessageContent {
  chapterId: string;
  newDescription: string;
  timestamp: number;
}

export class ChapterMessageUtil {
  public static parseChapter(message: Message): ChapterMessageContent | null {
    try {
      const content = JSON.parse(message.content) as ChapterMessageContent;
      return this.isValidChapterContent(content) ? content : null;
    } catch {
      return null;
    }
  }

  public static parseChapterEdit(
    message: Message
  ): ChapterEditMessageContent | null {
    try {
      const content = JSON.parse(message.content) as ChapterEditMessageContent;
      return this.isValidChapterEditContent(content) ? content : null;
    } catch {
      return null;
    }
  }

  public static createChapter(
    description: string,
    keepLastNMessages: number = 6
  ): Message {
    const content: ChapterMessageContent = {
      description,
      keepLastNMessages,
      timestamp: Date.now(),
    };
    return {
      id: this.generateChapterId(),
      role: "chapter",
      content: JSON.stringify(content),
    };
  }

  public static createChapterEdit(
    chapterId: string,
    newDescription: string
  ): Message {
    const content: ChapterEditMessageContent = {
      chapterId,
      newDescription,
      timestamp: Date.now(),
    };
    return {
      id: this.generateChapterEditId(),
      role: "chapter-edit",
      content: JSON.stringify(content),
    };
  }

  private static isValidChapterContent(
    content: any
  ): content is ChapterMessageContent {
    return (
      typeof content?.description === "string" &&
      typeof content?.keepLastNMessages === "number" &&
      typeof content?.timestamp === "number"
    );
  }

  private static isValidChapterEditContent(
    content: any
  ): content is ChapterEditMessageContent {
    return (
      typeof content?.chapterId === "string" &&
      typeof content?.newDescription === "string" &&
      typeof content?.timestamp === "number"
    );
  }

  private static generateChapterId(): string {
    return `chapter-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
  }

  private static generateChapterEditId(): string {
    return `chapter-edit-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
  }
}
