import { describe, it, expect, beforeEach } from "vitest";
import { LLMChatProjection } from "../LLMChatProjection";
import { MessageCreatedEventUtil } from "../events/MessageCreatedEventUtil";
import { ReasoningCreatedEventUtil } from "../events/ReasoningEventUtils";
import type { ChapterCreatedEvent } from "../events/ChatEvent";

const createChapterEvent = (
  chapterId: string,
  coveredMessageIds: string[],
): ChapterCreatedEvent => ({
  type: "ChapterCreated",
  chapterId,
  title: "Chapter",
  summary: "Summary",
  coveredMessageIds,
});

describe("LLMChatProjection - Reasoning Events", () => {
  let projection: LLMChatProjection;

  beforeEach(() => {
    projection = new LLMChatProjection();
  });

  it("adds reasoning as assistant context with reasoning markers", () => {
    projection.process(ReasoningCreatedEventUtil.Create("Keep continuity."));

    const messages = projection.GetMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("assistant");
    expect(messages[0].content).toBe(
      "[Reasoning]\nKeep continuity.\n[End of Reasoning]",
    );
  });

  it("places reasoning chronologically before the final assistant message", () => {
    projection.process(MessageCreatedEventUtil.Create("user", "What next?"));
    projection.process(ReasoningCreatedEventUtil.Create("Continue the scene."));
    projection.process(MessageCreatedEventUtil.Create("assistant", "Next."));

    expect(projection.GetMessages().map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "assistant",
    ]);
    expect(projection.GetMessages()[1].content).toContain("[Reasoning]");
  });

  it("marks reasoning as chapter-hidden when chapter compression covers it", () => {
    const user = MessageCreatedEventUtil.Create("user", "Start");
    const reasoning = ReasoningCreatedEventUtil.Create("Bridge the intent.");
    const assistant = MessageCreatedEventUtil.Create("assistant", "Done");

    projection.process(user);
    projection.process(reasoning);
    projection.process(assistant);
    projection.process(
      createChapterEvent("chapter-1", [
        user.messageId,
        reasoning.messageId,
        assistant.messageId,
      ]),
    );

    const reasoningMessage = projection.GetMessage(reasoning.messageId) as {
      hiddenByChapterId?: string;
    };
    expect(reasoningMessage.hiddenByChapterId).toBe("chapter-1");
  });
});
