import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PlanGenerationService } from "./PlanGenerationService";
import type { Plan } from "./Plan";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";

vi.mock("../../../services/Dependencies");

describe("PlanGenerationService", () => {
  const testChatId = "test-chat-123";

  let mockPlanService: {
    getPlans: ReturnType<typeof vi.fn>;
    savePlans: ReturnType<typeof vi.fn>;
    Plans: Plan[];
  };

  let mockGrokChatAPI: {
    postChat: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPlanService = {
      getPlans: vi.fn().mockReturnValue([]),
      savePlans: vi.fn().mockResolvedValue(undefined),
      Plans: [],
    };

    mockGrokChatAPI = {
      postChat: vi.fn().mockResolvedValue("Generated content"),
    };

    vi.mocked(d.PlanService).mockReturnValue(mockPlanService as any);
    vi.mocked(d.GrokChatAPI).mockReturnValue(mockGrokChatAPI as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---- generateUpdatedPlans Tests ----
  describe("generateUpdatedPlans", () => {
    it("should do nothing when there are no plans", async () => {
      const service = new PlanGenerationService(testChatId);
      mockPlanService.getPlans.mockReturnValue([]);

      await service.generateUpdatedPlans(createMockChatMessages());

      expect(mockGrokChatAPI.postChat).not.toHaveBeenCalled();
    });

    it("should only regenerate plans that are due for refresh", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        id: "due",
        refreshInterval: 3,
        messagesSinceLastUpdate: 3,
      });
      const notDuePlan = createPlan({
        id: "not-due",
        refreshInterval: 5,
        messagesSinceLastUpdate: 2,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan, notDuePlan]);

      await service.generateUpdatedPlans(createMockChatMessages());

      expect(mockGrokChatAPI.postChat).toHaveBeenCalledTimes(1);
    });

    it("should increment counter for plans not due for refresh", async () => {
      const service = new PlanGenerationService(testChatId);
      const notDuePlan = createPlan({
        refreshInterval: 5,
        messagesSinceLastUpdate: 2,
      });
      mockPlanService.getPlans.mockReturnValue([notDuePlan]);

      const result = await service.generateUpdatedPlans(
        createMockChatMessages(),
      );

      expect(result[0].messagesSinceLastUpdate).toBe(3);
    });

    it("should reset counter for regenerated plans", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        refreshInterval: 3,
        messagesSinceLastUpdate: 3,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);

      const result = await service.generateUpdatedPlans(
        createMockChatMessages(),
      );

      expect(result[0].messagesSinceLastUpdate).toBe(0);
    });

    it("should update content for regenerated plans", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        refreshInterval: 3,
        messagesSinceLastUpdate: 5,
        content: "Old content",
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);
      mockGrokChatAPI.postChat.mockResolvedValue("Fresh content");

      const result = await service.generateUpdatedPlans(
        createMockChatMessages(),
      );

      expect(result[0].content).toBe("Fresh content");
    });

    it("should preserve existing content for plans not due", async () => {
      const service = new PlanGenerationService(testChatId);
      const notDuePlan = createPlan({
        refreshInterval: 10,
        messagesSinceLastUpdate: 2,
        content: "Existing content",
      });
      mockPlanService.getPlans.mockReturnValue([notDuePlan]);

      const result = await service.generateUpdatedPlans(
        createMockChatMessages(),
      );

      expect(result[0].content).toBe("Existing content");
      expect(mockGrokChatAPI.postChat).not.toHaveBeenCalled();
    });

    it("should include chat messages and plan prompt in LLM request", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        name: "My Plan",
        prompt: "Analyze the story",
        refreshInterval: 1,
        messagesSinceLastUpdate: 1,
      });
      const chatMessages = createMockChatMessages();
      mockPlanService.getPlans.mockReturnValue([duePlan]);

      await service.generateUpdatedPlans(chatMessages);

      const callArgs = mockGrokChatAPI.postChat.mock.calls[0][0];
      expect(callArgs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ content: "Hello" }),
          expect.objectContaining({ content: "Hi there!" }),
        ]),
      );
      const lastMessage = callArgs[callArgs.length - 1];
      expect(lastMessage.content).toContain("My Plan");
      expect(lastMessage.content).toContain("Analyze the story");
    });

    it("should use clean prompt format without old formatting artifacts", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        refreshInterval: 1,
        messagesSinceLastUpdate: 1,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);

      await service.generateUpdatedPlans(createMockChatMessages());

      const callArgs = mockGrokChatAPI.postChat.mock.calls[0][0];
      const lastMessage = callArgs[callArgs.length - 1];
      expect(lastMessage.content).not.toContain("~");
      expect(lastMessage.content).not.toContain("=====");
      expect(lastMessage.content).toContain(
        "Generate a plan in Markdown. No preamble or additional commentary.",
      );
    });

    it("should save all plans via PlanService", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        id: "due",
        refreshInterval: 1,
        messagesSinceLastUpdate: 1,
      });
      const notDuePlan = createPlan({
        id: "not-due",
        refreshInterval: 10,
        messagesSinceLastUpdate: 0,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan, notDuePlan]);

      await service.generateUpdatedPlans(createMockChatMessages());

      expect(mockPlanService.savePlans).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "due", messagesSinceLastUpdate: 0 }),
          expect.objectContaining({
            id: "not-due",
            messagesSinceLastUpdate: 1,
          }),
        ]),
      );
    });

    it("should preserve plan metadata while updating content", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        name: "Test Plan",
        prompt: "Test prompt",
        refreshInterval: 2,
        messagesSinceLastUpdate: 2,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);
      mockGrokChatAPI.postChat.mockResolvedValue("New content");

      const result = await service.generateUpdatedPlans(
        createMockChatMessages(),
      );

      expect(result[0]).toEqual({
        id: "plan-1",
        type: "planning",
        name: "Test Plan",
        prompt: "Test prompt",
        content: "New content",
        refreshInterval: 2,
        messagesSinceLastUpdate: 0,
      });
    });

    it("should process all due plans in parallel", async () => {
      const service = new PlanGenerationService(testChatId);
      const plans = [
        createPlan({
          id: "plan-1",
          refreshInterval: 1,
          messagesSinceLastUpdate: 1,
        }),
        createPlan({
          id: "plan-2",
          refreshInterval: 1,
          messagesSinceLastUpdate: 1,
        }),
      ];
      mockPlanService.getPlans.mockReturnValue(plans);
      mockGrokChatAPI.postChat.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve("Generated"), 10)),
      );

      const start = Date.now();
      await service.generateUpdatedPlans(createMockChatMessages());
      const elapsed = Date.now() - start;

      // If sequential, would take ~20ms. Parallel should be ~10ms.
      expect(elapsed).toBeLessThan(18);
    });

    it("should regenerate plan when counter exceeds interval", async () => {
      const service = new PlanGenerationService(testChatId);
      const overduePlan = createPlan({
        refreshInterval: 3,
        messagesSinceLastUpdate: 10,
      });
      mockPlanService.getPlans.mockReturnValue([overduePlan]);
      mockGrokChatAPI.postChat.mockResolvedValue("Refreshed");

      const result = await service.generateUpdatedPlans(
        createMockChatMessages(),
      );

      expect(result[0].content).toBe("Refreshed");
      expect(result[0].messagesSinceLastUpdate).toBe(0);
    });

    it("should handle mix of due and not-due plans correctly", async () => {
      const service = new PlanGenerationService(testChatId);
      const plans = [
        createPlan({
          id: "due-1",
          refreshInterval: 2,
          messagesSinceLastUpdate: 2,
          content: "Old",
        }),
        createPlan({
          id: "not-due",
          refreshInterval: 5,
          messagesSinceLastUpdate: 1,
          content: "Existing",
        }),
        createPlan({
          id: "due-2",
          refreshInterval: 3,
          messagesSinceLastUpdate: 4,
          content: "Stale",
        }),
      ];
      mockPlanService.getPlans.mockReturnValue(plans);
      mockGrokChatAPI.postChat
        .mockResolvedValueOnce("New content 1")
        .mockResolvedValueOnce("New content 2");

      const result = await service.generateUpdatedPlans(
        createMockChatMessages(),
      );

      expect(mockGrokChatAPI.postChat).toHaveBeenCalledTimes(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: "due-1",
          content: "New content 1",
          messagesSinceLastUpdate: 0,
        }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          id: "not-due",
          content: "Existing",
          messagesSinceLastUpdate: 2,
        }),
      );
      expect(result[2]).toEqual(
        expect.objectContaining({
          id: "due-2",
          content: "New content 2",
          messagesSinceLastUpdate: 0,
        }),
      );
    });
  });

  // ---- hasPlansNeedingRefresh Tests ----
  describe("hasPlansNeedingRefresh", () => {
    it("should return false when there are no plans", () => {
      const service = new PlanGenerationService(testChatId);
      mockPlanService.getPlans.mockReturnValue([]);

      expect(service.hasPlansNeedingRefresh()).toBe(false);
    });

    it("should return true when at least one plan is due", () => {
      const service = new PlanGenerationService(testChatId);
      mockPlanService.getPlans.mockReturnValue([
        createPlan({ refreshInterval: 3, messagesSinceLastUpdate: 3 }),
      ]);

      expect(service.hasPlansNeedingRefresh()).toBe(true);
    });

    it("should return false when no plans are due", () => {
      const service = new PlanGenerationService(testChatId);
      mockPlanService.getPlans.mockReturnValue([
        createPlan({ refreshInterval: 5, messagesSinceLastUpdate: 2 }),
        createPlan({ refreshInterval: 10, messagesSinceLastUpdate: 0 }),
      ]);

      expect(service.hasPlansNeedingRefresh()).toBe(false);
    });

    it("should return true when one of many plans is due", () => {
      const service = new PlanGenerationService(testChatId);
      mockPlanService.getPlans.mockReturnValue([
        createPlan({ refreshInterval: 10, messagesSinceLastUpdate: 1 }),
        createPlan({ refreshInterval: 3, messagesSinceLastUpdate: 5 }),
        createPlan({ refreshInterval: 20, messagesSinceLastUpdate: 0 }),
      ]);

      expect(service.hasPlansNeedingRefresh()).toBe(true);
    });
  });

  // ---- Helper Functions ----
  function createMockChatMessages(): LLMMessage[] {
    return [
      { id: "msg-1", role: "user", content: "Hello" },
      { id: "msg-2", role: "assistant", content: "Hi there!" },
    ];
  }

  function createPlan(overrides: Partial<Plan> = {}): Plan {
    return {
      id: "plan-1",
      type: "planning",
      name: "Test Plan",
      prompt: "Test prompt",
      content: "Old content",
      refreshInterval: 5,
      messagesSinceLastUpdate: 0,
      ...overrides,
    };
  }
});
