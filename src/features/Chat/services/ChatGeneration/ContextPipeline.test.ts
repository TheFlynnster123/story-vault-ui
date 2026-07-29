import { describe, expect, it } from "vitest";
import {
  LLMChatProjection,
  type LLMMessage,
} from "../../../../services/CQRS/LLMChatProjection";
import type {
  BookCreatedEvent,
  ChapterCreatedEvent,
} from "../../../../services/CQRS/events/ChatEvent";
import { createGeneratedTextMessageEvent } from "../../../../services/CQRS/tests/TextMessageEventTestUtils";
import { NoteCreatedEventUtil } from "../../../../services/CQRS/events/NoteEventUtils";
import { PlanCreatedEventUtil } from "../../../../services/CQRS/events/PlanEventUtils";
import { ReasoningCreatedEventUtil } from "../../../../services/CQRS/events/ReasoningEventUtils";
import { StoryCreatedEventUtil } from "../../../../services/CQRS/events/StoryCreatedEventUtil";
import {
  createContextDocument,
  renderContextDocumentMessages,
} from "./ContextDocument";

describe("context pipeline parity", () => {
  it("preserves exact cross-source ordering through projection and durable composition", () => {
    const projection = new LLMChatProjection();
    const story = StoryCreatedEventUtil.Create("The winter city");
    const openingUser = createGeneratedTextMessageEvent("user", "Open the gate");
    const openingAssistant = createGeneratedTextMessageEvent(
      "assistant",
      "The gate opens",
    );
    const plan = PlanCreatedEventUtil.Create(
      "arc-plan",
      "Arc",
      "Reach the observatory",
    );
    const note = NoteCreatedEventUtil.Create("Keep the snowstorm active", null);
    const recentUser = createGeneratedTextMessageEvent(
      "user",
      "Mara steps through",
    );
    const reasoning = ReasoningCreatedEventUtil.Create(
      "Preserve Mara's caution",
    );

    projection.process(story);
    projection.process(openingUser);
    projection.process(openingAssistant);
    projection.process(
      createChapter("chapter-1", [
        openingUser.messageId,
        openingAssistant.messageId,
      ]),
    );
    projection.process(createBook("book-1", ["chapter-1"]));
    projection.process(plan);
    projection.process(note);
    projection.process(recentUser);
    projection.process(reasoning);

    const projectedHistory = projection.GetMessages({
      trailingChapterMessages: 2,
      reasoningRetentionMessages: 4,
    });
    const document = createContextDocument({
      projectedHistory,
      memoryMessages: [systemMessage("# Memories\r\nMara carries the key")],
      characterSheetMessages: [
        systemMessage("# Character Sheets\r\n## Mara\n- Cautious navigator"),
      ],
      recentMessageCount: 2,
    });
    const messages = [
      ...renderContextDocumentMessages(document),
      systemMessage("Continue the story"),
    ];

    expect(messages.map((message) => message.content)).toEqual([
      "# Story\r\nThe winter city",
      "[Book Summary: Book]\nBook summary\n[End of Book Summary]",
      "[Plan: Arc]\nReach the observatory\n[End of Plan]",
      "[Note]\nKeep the snowstorm active\n[End of Note]",
      "# Memories\r\nMara carries the key",
      "# Character Sheets\r\n## Mara\n- Cautious navigator",
      "Mara steps through",
      "[Reasoning]\nPreserve Mara's caution\n[End of Reasoning]",
      "Continue the story",
    ]);
    expect(new Set(messages.flatMap((message) => message.id ?? [])).size).toBe(
      messages.filter((message) => message.id !== undefined).length,
    );
  });
});

const createChapter = (
  chapterId: string,
  coveredMessageIds: string[],
): ChapterCreatedEvent => ({
  type: "ChapterCreated",
  chapterId,
  title: "Chapter",
  summary: "Chapter summary",
  coveredMessageIds,
});

const createBook = (
  bookId: string,
  coveredChapterIds: string[],
): BookCreatedEvent => ({
  type: "BookCreated",
  bookId,
  title: "Book",
  summary: "Book summary",
  coveredChapterIds,
});

const systemMessage = (content: string): LLMMessage => ({
  role: "system" as const,
  content,
});
