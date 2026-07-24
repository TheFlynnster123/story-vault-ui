import { describe, it, expect, beforeEach } from "vitest";
import { UserChatProjection } from "../UserChatProjection";
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

describe("UserChatProjection - Reasoning Events", () => {
  let projection: UserChatProjection;

  beforeEach(() => {
    projection = new UserChatProjection();
  });

  it("adds reasoning messages to the visible timeline", () => {
    const event = ReasoningCreatedEventUtil.Create("Use the earlier clue.");

    projection.process(event);

    const messages = projection.GetMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      id: event.messageId,
      type: "reasoning",
      content: "Use the earlier clue.",
      deleted: false,
      hidden: false,
    });
  });

  it("places reasoning chronologically between user and assistant messages", () => {
    projection.process(MessageCreatedEventUtil.Create("user", "What next?"));
    projection.process(ReasoningCreatedEventUtil.Create("Continue the scene."));
    projection.process(MessageCreatedEventUtil.Create("assistant", "Next."));

    expect(projection.GetMessages().map((m) => m.type)).toEqual([
      "user-message",
      "reasoning",
      "assistant",
    ]);
  });

  it("hides reasoning when it is covered by a chapter", () => {
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

    expect(projection.GetMessages().map((m) => m.type)).toEqual(["chapter"]);
  });

  it("returns the last persisted text message from the chat view", () => {
    projection.process(MessageCreatedEventUtil.Create("user", "Start"));
    const reasoning = ReasoningCreatedEventUtil.Create("Think first.");
    projection.process(reasoning);
    projection.process({
      type: "PlanCreated",
      messageId: "plan-1",
      planDefinitionId: "definition-1",
      planName: "Draft",
      content: "Plan content",
    });

    expect(projection.GetLastPersistedTextMessage()?.id).toBe(
      reasoning.messageId,
    );
  });

  it("ignores deleted text messages after reasoning", () => {
    const reasoning = ReasoningCreatedEventUtil.Create("Keep this reasoning.");
    const assistant = MessageCreatedEventUtil.Create(
      "assistant",
      "Failed response",
    );
    projection.process(reasoning);
    projection.process(assistant);
    projection.process({
      type: "MessageDeleted",
      messageId: assistant.messageId,
    });

    expect(projection.GetLastPersistedTextMessage()?.id).toBe(
      reasoning.messageId,
    );
  });

  it("ignores a transient new response after reasoning", () => {
    const reasoning = ReasoningCreatedEventUtil.Create("Keep this reasoning.");
    projection.process(reasoning);
    projection.addStreamingMessage("streaming-response");

    expect(projection.GetLastPersistedTextMessage()?.id).toBe(
      reasoning.messageId,
    );
  });

  it("ignores an assistant message while it is being regenerated", () => {
    const reasoning = ReasoningCreatedEventUtil.Create("Keep this reasoning.");
    const assistant = MessageCreatedEventUtil.Create("assistant", "Response");
    projection.process(reasoning);
    projection.process(assistant);
    projection.startStreamingExistingMessage(assistant.messageId);

    expect(projection.GetLastPersistedTextMessage()?.id).toBe(
      reasoning.messageId,
    );
  });
});
