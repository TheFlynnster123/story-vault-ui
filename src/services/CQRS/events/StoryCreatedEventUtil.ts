import type { StoryCreatedEvent } from "./ChatEvent";

export class StoryCreatedEventUtil {
  public static Create(content: string): StoryCreatedEvent {
    return {
      type: "StoryCreated",
      storyId: this.generateStoryId(),
      content,
    };
  }

  static generateStoryId(): string {
    return `story-${Date.now()}-${this.generateRandomSuffix()}`;
  }

  static generateRandomSuffix(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}
