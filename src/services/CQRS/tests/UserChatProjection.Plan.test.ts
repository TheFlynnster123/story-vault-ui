import { describe, it, expect, beforeEach } from "vitest";
import { UserChatProjection } from "../UserChatProjection";
import type { PlanChatMessage } from "../UserChatProjection";
import {
  PlanCreatedEventUtil,
  PlanHiddenEventUtil,
} from "../events/PlanEventUtils";
import { MessageCreatedEventUtil } from "../events/MessageCreatedEventUtil";

describe("UserChatProjection - Plan Events", () => {
  let projection: UserChatProjection;

  beforeEach(() => {
    projection = new UserChatProjection();
  });

  describe("PlanCreated Event", () => {
    it("should add plan message to messages", () => {
      const event = createPlanEvent("plan-1", "Story Arc", "Arc content");

      projection.process(event);

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe("plan");
      expect(messages[0].content).toBe("Arc content");
    });

    it("should store planDefinitionId in data", () => {
      const event = createPlanEvent("def-42", "Plot Plan", "Plot details");

      projection.process(event);

      const plan = projection.GetMessages()[0] as PlanChatMessage;
      expect(plan.data.planDefinitionId).toBe("def-42");
    });

    it("should store planName in data", () => {
      const event = createPlanEvent("def-1", "Character Arc", "Details");

      projection.process(event);

      const plan = projection.GetMessages()[0] as PlanChatMessage;
      expect(plan.data.planName).toBe("Character Arc");
    });

    it("should use messageId from event", () => {
      const event = createPlanEvent("def-1", "Plan", "Content");

      projection.process(event);

      const message = projection.GetMessage(event.messageId);
      expect(message).toBeDefined();
      expect(message?.type).toBe("plan");
    });

    it("should mark plan as not deleted", () => {
      const event = createPlanEvent("def-1", "Plan", "Content");

      projection.process(event);

      const plan = projection.GetMessage(event.messageId);
      expect(plan?.deleted).toBe(false);
    });

    it("should mark plan as not hidden", () => {
      const event = createPlanEvent("def-1", "Plan", "Content");

      projection.process(event);

      const plan = projection.GetMessage(event.messageId);
      expect(plan?.hidden).toBe(false);
    });

    it("should not set hiddenByChapterId", () => {
      const event = createPlanEvent("def-1", "Plan", "Content");

      projection.process(event);

      const plan = projection.GetMessage(event.messageId);
      expect(plan?.hiddenByChapterId).toBeUndefined();
    });

    it("should appear after existing messages in timeline", () => {
      const msgEvent = MessageCreatedEventUtil.Create("user", "Hello");
      projection.process(msgEvent);

      const planEvent = createPlanEvent("def-1", "Plan", "Content");
      projection.process(planEvent);

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].type).toBe("user-message");
      expect(messages[1].type).toBe("plan");
    });

    it("should support multiple plans from different definitions", () => {
      projection.process(createPlanEvent("def-1", "Arc Plan", "Arc"));
      projection.process(createPlanEvent("def-2", "Theme Plan", "Theme"));

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(2);

      const planMessages = messages as PlanChatMessage[];
      expect(planMessages[0].data.planDefinitionId).toBe("def-1");
      expect(planMessages[1].data.planDefinitionId).toBe("def-2");
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
      expect((messages[0] as PlanChatMessage).data.planDefinitionId).toBe(
        "def-2",
      );
    });

    it("should hide all instances of same definition", () => {
      projection.process(createPlanEvent("def-1", "Plan v1", "v1"));
      projection.process(createPlanEvent("def-1", "Plan v2", "v2"));

      projection.process(PlanHiddenEventUtil.Create("def-1"));

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(0);
    });

    it("should not affect non-plan messages", () => {
      const msgEvent = MessageCreatedEventUtil.Create("user", "Hello");
      projection.process(msgEvent);
      projection.process(createPlanEvent("def-1", "Plan", "Content"));

      projection.process(PlanHiddenEventUtil.Create("def-1"));

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe("user-message");
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

      // GetMessage returns from internal storage (not filtered)
      const plan = projection.GetMessage(planEvent.messageId);
      expect(plan?.hidden).toBe(true);
      expect(plan?.deleted).toBe(false);
    });
  });

  describe("Plan Lifecycle", () => {
    it("should show only the latest plan after hide-and-create cycle", () => {
      projection.process(createPlanEvent("def-1", "Plan", "v1 content"));

      projection.process(PlanHiddenEventUtil.Create("def-1"));
      projection.process(createPlanEvent("def-1", "Plan", "v2 content"));

      const messages = projection.GetMessages();
      const planMessages = messages.filter((m) => m.type === "plan");
      expect(planMessages).toHaveLength(1);
      expect(planMessages[0].content).toBe("v2 content");
    });

    it("should interleave plans with regular messages chronologically", () => {
      projection.process(MessageCreatedEventUtil.Create("user", "Message 1"));
      projection.process(createPlanEvent("def-1", "Plan", "Plan v1"));
      projection.process(
        MessageCreatedEventUtil.Create("assistant", "Response 1"),
      );

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0].type).toBe("user-message");
      expect(messages[1].type).toBe("plan");
      expect(messages[2].type).toBe("assistant");
    });

    it("should handle multiple plan definitions with independent hiding", () => {
      projection.process(createPlanEvent("arc", "Arc Plan", "Arc v1"));
      projection.process(createPlanEvent("theme", "Theme Plan", "Theme v1"));

      // Hide only arc plans
      projection.process(PlanHiddenEventUtil.Create("arc"));
      projection.process(createPlanEvent("arc", "Arc Plan", "Arc v2"));

      const messages = projection.GetMessages();
      const planMessages = messages.filter((m) => m.type === "plan");
      expect(planMessages).toHaveLength(2);

      const planDefs = planMessages.map(
        (m) => (m as PlanChatMessage).data.planDefinitionId,
      );
      expect(planDefs).toContain("arc");
      expect(planDefs).toContain("theme");
    });
  });
});

// ---- Test Helpers ----

const createPlanEvent = (
  planDefinitionId: string,
  planName: string,
  content: string,
) => PlanCreatedEventUtil.Create(planDefinitionId, planName, content);
