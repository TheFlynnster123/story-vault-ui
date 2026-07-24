import { beforeEach, describe, expect, it } from "vitest";
import { LLMChatProjection } from "../LLMChatProjection";
import type {
  BookCreatedEvent,
  ChapterCreatedEvent,
} from "../events/ChatEvent";
import { MessageCreatedEventUtil } from "../events/MessageCreatedEventUtil";
import { NoteCreatedEventUtil } from "../events/NoteEventUtils";
import { PlanCreatedEventUtil } from "../events/PlanEventUtils";
import { ReasoningCreatedEventUtil } from "../events/ReasoningEventUtils";
import { StoryCreatedEventUtil } from "../events/StoryCreatedEventUtil";

describe("LLMChatProjection context trace", () => {
  let projection: LLMChatProjection;

  beforeEach(() => {
    projection = new LLMChatProjection();
  });

  it("identifies Story as its own included context type", () => {
    const story = StoryCreatedEventUtil.Create("A city in winter");
    projection.process(story);

    expect(projection.GetContext().trace).toContainEqual({
      id: story.storyId,
      type: "story",
      included: true,
      buffered: false,
      exclusionReason: undefined,
    });
  });

  it("marks only chapter-hidden messages restored by the buffer as buffered", () => {
    const messageIds = createMessages(8);
    projection.process(createChapter("chapter-1", messageIds));

    const trace = projection.GetContext().trace;

    expect(getTrace(trace, messageIds[0])).toMatchObject({
      included: false,
      buffered: false,
      exclusionReason: "chapter-compressed",
    });
    expect(getTrace(trace, messageIds[2])).toMatchObject({
      included: true,
      buffered: true,
      exclusionReason: undefined,
    });
  });

  it("marks a chapter hidden by a book as book-compressed", () => {
    const [messageId] = createMessages(1);
    projection.process(createChapter("chapter-1", [messageId]));
    projection.process(createBook("book-1", ["chapter-1"]));

    expect(getTrace(projection.GetContext().trace, "chapter-1")).toMatchObject({
      included: false,
      exclusionReason: "book-compressed",
    });
  });

  it("reports expired Notes and reasoning independently", () => {
    const note = NoteCreatedEventUtil.Create("Temporary", 1);
    const reasoning = ReasoningCreatedEventUtil.Create("Private thought");
    projection.process(note);
    projection.process(reasoning);
    projection.process(MessageCreatedEventUtil.Create("user", "Continue"));

    const trace = projection.GetContext({
      reasoningRetentionMessages: 0,
    }).trace;

    expect(getTrace(trace, note.noteId).exclusionReason).toBe("expired-note");
    expect(getTrace(trace, reasoning.messageId).exclusionReason).toBe(
      "expired-reasoning",
    );
  });

  it("reports plan filtering without mutating later selections", () => {
    const plan = PlanCreatedEventUtil.Create("plan-1", "Arc", "Keep moving");
    projection.process(plan);

    const excluded = projection.GetContext({
      planSelection: {
        mode: "exclude-definition",
        planDefinitionId: "plan-1",
      },
    });
    const included = projection.GetContext();

    expect(getTrace(excluded.trace, plan.messageId).exclusionReason).toBe(
      "plan-filtered",
    );
    expect(included.messages.map((message) => message.id)).toContain(
      plan.messageId,
    );
  });

  it("does not retain chapter-buffer policy between selections", () => {
    const messageIds = createMessages(8);
    projection.process(createChapter("chapter-1", messageIds));

    expect(
      projection.GetMessages({ trailingChapterMessages: 0 }),
    ).toHaveLength(1);
    expect(projection.GetMessages()).toHaveLength(7);
  });

  const createMessages = (count: number): string[] =>
    Array.from({ length: count }, (_, index) => {
      const event = MessageCreatedEventUtil.Create(
        index % 2 === 0 ? "user" : "assistant",
        `Message ${index + 1}`,
      );
      projection.process(event);
      return event.messageId;
    });
});

const createChapter = (
  chapterId: string,
  coveredMessageIds: string[],
): ChapterCreatedEvent => ({
  type: "ChapterCreated",
  chapterId,
  title: "Chapter",
  summary: "Summary",
  coveredMessageIds,
});

const createBook = (
  bookId: string,
  coveredChapterIds: string[],
): BookCreatedEvent => ({
  type: "BookCreated",
  bookId,
  title: "Book",
  summary: "Summary",
  coveredChapterIds,
});

const getTrace = (
  trace: ReturnType<LLMChatProjection["GetContext"]>["trace"],
  id: string,
) => {
  const entry = trace.find((item) => item.id === id);
  expect(entry).toBeDefined();
  return entry!;
};
