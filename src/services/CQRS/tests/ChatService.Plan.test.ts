import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ChatService } from "../ChatService";
import { d } from "../../Dependencies";

vi.mock("../../Dependencies");

describe("ChatService - Plan Operations", () => {
  let mockChatEventService: any;
  const testChatId = "test-chat-plan";

  beforeEach(() => {
    mockChatEventService = {
      AddChatEvent: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(d.ChatEventService).mockReturnValue(mockChatEventService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("AddPlanMessage", () => {
    it("should emit PlanHidden event before PlanCreated event", async () => {
      const service = new ChatService(testChatId);

      await service.AddPlanMessage("def-1", "Plan Name", "Plan content");

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(2);
      const firstCall = mockChatEventService.AddChatEvent.mock.calls[0][0];
      const secondCall = mockChatEventService.AddChatEvent.mock.calls[1][0];
      expect(firstCall.type).toBe("PlanHidden");
      expect(secondCall.type).toBe("PlanCreated");
    });

    it("should create PlanHidden event with correct planDefinitionId", async () => {
      const service = new ChatService(testChatId);

      await service.AddPlanMessage("def-42", "Plan", "Content");

      const hideEvent = getCalledEventAt(0);
      expect(hideEvent.type).toBe("PlanHidden");
      expect(hideEvent.planDefinitionId).toBe("def-42");
    });

    it("should create PlanCreated event with all fields", async () => {
      const service = new ChatService(testChatId);

      await service.AddPlanMessage("def-1", "Story Arc", "Arc details");

      const createEvent = getCalledEventAt(1);
      expect(createEvent.type).toBe("PlanCreated");
      expect(createEvent.planDefinitionId).toBe("def-1");
      expect(createEvent.planName).toBe("Story Arc");
      expect(createEvent.content).toBe("Arc details");
    });

    it("should generate a messageId for PlanCreated event", async () => {
      const service = new ChatService(testChatId);

      await service.AddPlanMessage("def-1", "Plan", "Content");

      const createEvent = getCalledEventAt(1);
      expect(createEvent.messageId).toBeDefined();
      expect(createEvent.messageId).toMatch(/^plan-/);
    });

    it("should use correct chatId for ChatEventService", async () => {
      const service = new ChatService(testChatId);

      await service.AddPlanMessage("def-1", "Plan", "Content");

      expect(d.ChatEventService).toHaveBeenCalledWith(testChatId);
    });

    it("should hide previous plans even if none exist", async () => {
      const service = new ChatService(testChatId);

      await service.AddPlanMessage("def-1", "Plan", "Content");

      // PlanHidden is always emitted, even if no matching plans exist
      const hideEvent = getCalledEventAt(0);
      expect(hideEvent.type).toBe("PlanHidden");
    });
  });

  // ---- Test Helpers ----

  const getCalledEventAt = (index: number) =>
    mockChatEventService.AddChatEvent.mock.calls[index][0];
});
