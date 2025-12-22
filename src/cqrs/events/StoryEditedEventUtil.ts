import type { StoryEditedEvent } from "./ChatEvent";

export class StoryEditedEventUtil {
  public static Create(storyId: string, content: string): StoryEditedEvent {
    return {
      type: "StoryEdited",
      storyId,
      content,
    };
  }
}
