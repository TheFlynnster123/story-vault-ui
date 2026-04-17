import { describe, it, expect, beforeEach } from "vitest";
import { LLMChatProjection } from "../LLMChatProjection";
import {
  PlanCreatedEventUtil,
  PlanHiddenEventUtil,
} from "../events/PlanEventUtils";
import { MessageCreatedEventUtil } from "../events/MessageCreatedEventUtil";
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

describe("LLMChatProjection - Plan Events", () => {
  let projection: LLMChatProjection;

  beforeEach(() => {
    projection = new LLMChatProjection();
  });

  describe("PlanCreated Event", () => {
    it("should add plan message with formatted content", () => {
      const event = createPlanEvent("def-1", "Story Arc", "Arc details");

      projection.process(event);

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe(
        "[Plan: Story Arc]\nArc details\n[End of Plan]",
      );
    });

    it("should use system role for plan messages", () => {
      const event = createPlanEvent("def-1", "Plan", "Content");

      projection.process(event);

      const messages = projection.GetMessages();
      expect(messages[0].role).toBe("system");
    });

    it("should store planDefinitionId in message data", () => {
      const event = createPlanEvent("def-42", "Plot Plan", "Plot details");

      projection.process(event);

      const state = projection.getMessage(event.messageId);
      expect(state?.data?.planDefinitionId).toBe("def-42");
    });

    it("should store planName in message data", () => {
      const event = createPlanEvent("def-1", "Character Arc", "Details");

      projection.process(event);

      const state = projection.getMessage(event.messageId);
      expect(state?.data?.planName).toBe("Character Arc");
    });

    it("should store raw content in message data", () => {
      const event = createPlanEvent("def-1", "Plan", "Raw plan content");

      projection.process(event);

      const state = projection.getMessage(event.messageId);
      expect(state?.data?.rawContent).toBe("Raw plan content");
    });

    it("should be retrievable by messageId", () => {
      const event = createPlanEvent("def-1", "Plan", "Content");

      projection.process(event);

      const message = projection.GetMessage(event.messageId);
      expect(message).toBeDefined();
    });

    it("should mark plan as not hidden", () => {
      const event = createPlanEvent("def-1", "Plan", "Content");

      projection.process(event);

      const state = projection.getMessage(event.messageId);
      expect(state?.hidden).toBe(false);
    });

    it("should mark plan as not deleted", () => {
      const event = createPlanEvent("def-1", "Plan", "Content");

      projection.process(event);

      const state = projection.getMessage(event.messageId);
      expect(state?.deleted).toBe(false);
    });
  });

  describe("PlanHidden Event", () => {
    it("should hide plan messages for matching definition", () => {
      projection.process(createPlanEvent("def-1", "Plan", "Content"));

      projection.process(PlanHiddenEventUtil.Create("def-1"));

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(0);
    });

    it("should not hide plans from other definitions", () => {
      projection.process(createPlanEvent("def-1", "Plan A", "A"));
      projection.process(createPlanEvent("def-2", "Plan B", "B"));

      projection.process(PlanHiddenEventUtil.Create("def-1"));

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain("Plan B");
    });

    it("should hide all instances of same definition", () => {
      projection.process(createPlanEvent("def-1", "Plan v1", "v1"));
      projection.process(createPlanEvent("def-1", "Plan v2", "v2"));

      projection.process(PlanHiddenEventUtil.Create("def-1"));

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(0);
    });

    it("should not affect non-plan messages", () => {
      projection.process(MessageCreatedEventUtil.Create("user", "Hello"));
      projection.process(createPlanEvent("def-1", "Plan", "Content"));

      projection.process(PlanHiddenEventUtil.Create("def-1"));

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe("user");
    });

    it("should handle hiding when no plans exist", () => {
      expect(() =>
        projection.process(PlanHiddenEventUtil.Create("non-existent")),
      ).not.toThrow();
    });

    it("should set hidden flag instead of deleting", () => {
      const planEvent = createPlanEvent("def-1", "Plan", "Content");
      projection.process(planEvent);

      projection.process(PlanHiddenEventUtil.Create("def-1"));

      const state = projection.getMessage(planEvent.messageId);
      expect(state?.hidden).toBe(true);
      expect(state?.deleted).toBe(false);
    });
  });

  describe("Plan Content Formatting", () => {
    it("should wrap content with plan name markers", () => {
      projection.process(createPlanEvent("def-1", "My Plan", "Content"));

      const messages = projection.GetMessages();
      expect(messages[0].content.startsWith("[Plan: My Plan]")).toBe(true);
      expect(messages[0].content.endsWith("[End of Plan]")).toBe(true);
    });

    it("should preserve content between markers", () => {
      const content = "Step 1: Do this\nStep 2: Do that";
      projection.process(createPlanEvent("def-1", "Plan", content));

      const messages = projection.GetMessages();
      expect(messages[0].content).toContain(content);
    });

    it("should use formatPlanContent method consistently", () => {
      const formatted = projection.formatPlanContent(
        "Test Plan",
        "Test content",
      );
      expect(formatted).toBe("[Plan: Test Plan]\nTest content\n[End of Plan]");
    });
  });

  describe("Plan Lifecycle in LLM Context", () => {
    it("should show only latest plan after hide-and-create cycle", () => {
      projection.process(createPlanEvent("def-1", "Plan", "v1"));

      projection.process(PlanHiddenEventUtil.Create("def-1"));
      projection.process(createPlanEvent("def-1", "Plan", "v2"));

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain("v2");
      expect(messages[0].content).not.toContain("v1");
    });

    it("should place plans chronologically among other messages", () => {
      projection.process(MessageCreatedEventUtil.Create("user", "Message 1"));
      projection.process(createPlanEvent("def-1", "Plan", "Plan content"));
      projection.process(
        MessageCreatedEventUtil.Create("assistant", "Response"),
      );

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("system");
      expect(messages[1].content).toContain("[Plan:");
      expect(messages[2].role).toBe("assistant");
    });

    it("should handle independent plan definitions", () => {
      projection.process(createPlanEvent("arc", "Arc Plan", "Arc"));
      projection.process(createPlanEvent("theme", "Theme Plan", "Theme"));

      projection.process(PlanHiddenEventUtil.Create("arc"));
      projection.process(createPlanEvent("arc", "Arc Plan", "Arc v2"));

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(2);

      const contents = messages.map((m) => m.content);
      expect(contents.some((c) => c.includes("Arc v2"))).toBe(true);
      expect(contents.some((c) => c.includes("Theme"))).toBe(true);
    });
  });

  describe("GetMessagesExcludingPlan", () => {
    it("should exclude plan messages for the specified definition", () => {
      projection.process(MessageCreatedEventUtil.Create("user", "Hello"));
      projection.process(
        createPlanEvent("def-1", "Story Plan", "Plan content"),
      );
      projection.process(MessageCreatedEventUtil.Create("assistant", "Hi"));

      const messages = projection.GetMessagesExcludingPlan("def-1");

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe("Hello");
      expect(messages[1].content).toBe("Hi");
    });

    it("should keep plan messages from other definitions", () => {
      projection.process(createPlanEvent("def-1", "Plan A", "A content"));
      projection.process(createPlanEvent("def-2", "Plan B", "B content"));

      const messages = projection.GetMessagesExcludingPlan("def-1");

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain("Plan B");
    });

    it("should return all messages when no plans match the definition", () => {
      projection.process(MessageCreatedEventUtil.Create("user", "Hello"));
      projection.process(createPlanEvent("def-1", "Plan", "Content"));

      const messages = projection.GetMessagesExcludingPlan("nonexistent");

      expect(messages).toHaveLength(2);
    });

    it("should return all messages when there are no plans at all", () => {
      projection.process(MessageCreatedEventUtil.Create("user", "Hello"));
      projection.process(MessageCreatedEventUtil.Create("assistant", "Hi"));

      const messages = projection.GetMessagesExcludingPlan("any-id");

      expect(messages).toHaveLength(2);
    });

    it("should not exclude hidden plan messages (already filtered by GetMessages)", () => {
      projection.process(createPlanEvent("def-1", "Plan", "v1"));
      projection.process(PlanHiddenEventUtil.Create("def-1"));
      projection.process(createPlanEvent("def-1", "Plan", "v2"));

      const messages = projection.GetMessagesExcludingPlan("def-1");

      // v1 is already hidden by GetMessages, v2 is excluded by the filter
      expect(messages).toHaveLength(0);
    });

    it("should preserve message order", () => {
      projection.process(MessageCreatedEventUtil.Create("user", "First"));
      projection.process(createPlanEvent("def-1", "Plan", "Plan content"));
      projection.process(MessageCreatedEventUtil.Create("user", "Second"));
      projection.process(MessageCreatedEventUtil.Create("assistant", "Third"));

      const messages = projection.GetMessagesExcludingPlan("def-1");

      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe("First");
      expect(messages[1].content).toBe("Second");
      expect(messages[2].content).toBe("Third");
    });
  });

  describe("GetMessagesExcludingAllPlans", () => {
    it("should exclude all plan messages", () => {
      projection.process(MessageCreatedEventUtil.Create("user", "Hello"));
      projection.process(
        createPlanEvent("def-1", "Story Plan", "Plan content"),
      );
      projection.process(MessageCreatedEventUtil.Create("assistant", "Hi"));
      projection.process(
        createPlanEvent("def-2", "Character Plan", "Character details"),
      );

      const messages = projection.GetMessagesExcludingAllPlans();

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe("Hello");
      expect(messages[1].content).toBe("Hi");
    });

    it("should return all messages when there are no plans", () => {
      projection.process(MessageCreatedEventUtil.Create("user", "Hello"));
      projection.process(MessageCreatedEventUtil.Create("assistant", "Hi"));

      const messages = projection.GetMessagesExcludingAllPlans();

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe("Hello");
      expect(messages[1].content).toBe("Hi");
    });

    it("should return empty array when only plans exist", () => {
      projection.process(createPlanEvent("def-1", "Plan A", "A content"));
      projection.process(createPlanEvent("def-2", "Plan B", "B content"));

      const messages = projection.GetMessagesExcludingAllPlans();

      expect(messages).toHaveLength(0);
    });

    it("should not exclude hidden plan messages (already filtered by GetMessages)", () => {
      projection.process(createPlanEvent("def-1", "Plan", "v1"));
      projection.process(PlanHiddenEventUtil.Create("def-1"));
      projection.process(createPlanEvent("def-1", "Plan", "v2"));
      projection.process(MessageCreatedEventUtil.Create("user", "Hello"));

      const messages = projection.GetMessagesExcludingAllPlans();

      // v1 is already hidden by GetMessages, v2 is excluded by the filter
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Hello");
    });

    it("should preserve message order", () => {
      projection.process(MessageCreatedEventUtil.Create("user", "First"));
      projection.process(createPlanEvent("def-1", "Plan", "Plan content"));
      projection.process(MessageCreatedEventUtil.Create("user", "Second"));
      projection.process(createPlanEvent("def-2", "Plan B", "Plan B content"));
      projection.process(MessageCreatedEventUtil.Create("assistant", "Third"));

      const messages = projection.GetMessagesExcludingAllPlans();

      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe("First");
      expect(messages[1].content).toBe("Second");
      expect(messages[2].content).toBe("Third");
    });

    it("should exclude plans from all definitions", () => {
      projection.process(createPlanEvent("arc", "Arc Plan", "Arc"));
      projection.process(createPlanEvent("theme", "Theme Plan", "Theme"));
      projection.process(createPlanEvent("plot", "Plot Plan", "Plot"));
      projection.process(MessageCreatedEventUtil.Create("user", "Hello"));

      const messages = projection.GetMessagesExcludingAllPlans();

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Hello");
    });
  });

  describe("Chapter-Plan Interaction", () => {
    it("should not hide plan messages when chapter covers their IDs", () => {
      const msg = MessageCreatedEventUtil.Create("user", "Hello");
      projection.process(msg);
      const planEvent = createPlanEvent("def-1", "Story Plan", "Plan content");
      projection.process(planEvent);

      projection.process(
        createChapterEvent("ch-1", [msg.messageId, planEvent.messageId]),
      );

      // Add messages after chapter so buffer logic doesn't re-inject covered messages
      for (let i = 0; i < 10; i++) {
        projection.process(MessageCreatedEventUtil.Create("user", `Post ${i}`));
      }

      const messages = projection.GetMessages();
      const planMessages = messages.filter((m) => m.content.includes("[Plan:"));
      expect(planMessages).toHaveLength(1);
    });

    it("should still hide regular messages when chapter covers them alongside plans", () => {
      const msg1 = MessageCreatedEventUtil.Create("user", "Hello");
      projection.process(msg1);
      const planEvent = createPlanEvent("def-1", "Story Plan", "Plan content");
      projection.process(planEvent);
      const msg2 = MessageCreatedEventUtil.Create("assistant", "Hi there");
      projection.process(msg2);

      projection.process(
        createChapterEvent("ch-1", [
          msg1.messageId,
          planEvent.messageId,
          msg2.messageId,
        ]),
      );

      // Add enough messages after so buffer doesn't re-include hidden messages
      for (let i = 0; i < 10; i++) {
        projection.process(
          MessageCreatedEventUtil.Create("user", `Post chapter ${i}`),
        );
      }

      const messages = projection.GetMessages();
      const hasHello = messages.some(
        (m) => m.content === "Hello" && m.role === "user",
      );
      const hasHiThere = messages.some(
        (m) => m.content === "Hi there" && m.role === "assistant",
      );
      expect(hasHello).toBe(false);
      expect(hasHiThere).toBe(false);

      // But the plan should still be visible
      const hasPlan = messages.some((m) => m.content.includes("[Plan:"));
      expect(hasPlan).toBe(true);
    });

    it("should keep plan visible alongside chapter summary", () => {
      const msg = MessageCreatedEventUtil.Create("user", "Hello");
      projection.process(msg);
      const planEvent = createPlanEvent("def-1", "Story Plan", "Plan content");
      projection.process(planEvent);

      projection.process(
        createChapterEvent("ch-1", [msg.messageId, planEvent.messageId]),
      );

      // Add messages after chapter so buffer logic doesn't interfere
      for (let i = 0; i < 10; i++) {
        projection.process(MessageCreatedEventUtil.Create("user", `Post ${i}`));
      }

      const messages = projection.GetMessages();
      const hasPlan = messages.some((m) => m.content.includes("[Plan:"));
      const hasChapter = messages.some((m) =>
        m.content.includes("[Previous Chapter Summary:"),
      );
      expect(hasPlan).toBe(true);
      expect(hasChapter).toBe(true);
    });

    it("should not hide plan when multiple plans and messages are covered", () => {
      const msg1 = MessageCreatedEventUtil.Create("user", "Msg 1");
      projection.process(msg1);
      const plan1 = createPlanEvent("def-1", "Plan A", "A");
      projection.process(plan1);
      const msg2 = MessageCreatedEventUtil.Create("assistant", "Msg 2");
      projection.process(msg2);
      const plan2 = createPlanEvent("def-2", "Plan B", "B");
      projection.process(plan2);

      projection.process(
        createChapterEvent("ch-1", [
          msg1.messageId,
          plan1.messageId,
          msg2.messageId,
          plan2.messageId,
        ]),
      );

      // Add messages after chapter so buffer logic doesn't re-inject covered messages
      for (let i = 0; i < 10; i++) {
        projection.process(MessageCreatedEventUtil.Create("user", `Post ${i}`));
      }

      const messages = projection.GetMessages();
      const planMessages = messages.filter((m) => m.content.includes("[Plan:"));
      expect(planMessages).toHaveLength(2);
    });
  });
});

// ---- Test Helpers ----

const createPlanEvent = (
  planDefinitionId: string,
  planName: string,
  content: string,
) => PlanCreatedEventUtil.Create(planDefinitionId, planName, content);
