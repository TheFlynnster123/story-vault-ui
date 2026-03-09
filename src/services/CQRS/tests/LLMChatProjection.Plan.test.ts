import { describe, it, expect, beforeEach } from "vitest";
import { LLMChatProjection } from "../LLMChatProjection";
import {
  PlanCreatedEventUtil,
  PlanHiddenEventUtil,
} from "../events/PlanEventUtils";
import { MessageCreatedEventUtil } from "../events/MessageCreatedEventUtil";

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

      // Access internal state via cast since GetMessage returns LLMMessage
      const message = projection.GetMessage(event.messageId) as any;
      expect(message?.data?.planDefinitionId).toBe("def-42");
    });

    it("should store planName in message data", () => {
      const event = createPlanEvent("def-1", "Character Arc", "Details");

      projection.process(event);

      const message = projection.GetMessage(event.messageId) as any;
      expect(message?.data?.planName).toBe("Character Arc");
    });

    it("should store raw content in message data", () => {
      const event = createPlanEvent("def-1", "Plan", "Raw plan content");

      projection.process(event);

      const message = projection.GetMessage(event.messageId) as any;
      expect(message?.data?.rawContent).toBe("Raw plan content");
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

      const message = projection.GetMessage(event.messageId) as any;
      expect(message?.hidden).toBe(false);
    });

    it("should mark plan as not deleted", () => {
      const event = createPlanEvent("def-1", "Plan", "Content");

      projection.process(event);

      const message = projection.GetMessage(event.messageId) as any;
      expect(message?.deleted).toBe(false);
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

      const message = projection.GetMessage(planEvent.messageId) as any;
      expect(message?.hidden).toBe(true);
      expect(message?.deleted).toBe(false);
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
});

// ---- Test Helpers ----

const createPlanEvent = (
  planDefinitionId: string,
  planName: string,
  content: string,
) => PlanCreatedEventUtil.Create(planDefinitionId, planName, content);
