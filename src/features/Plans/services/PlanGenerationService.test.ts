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

  let mockChatService: {
    AddPlanMessage: ReturnType<typeof vi.fn>;
  };

  let mockLLMChatProjection: {
    GetMessages: ReturnType<typeof vi.fn>;
    GetMessagesExcludingPlan: ReturnType<typeof vi.fn>;
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

    mockChatService = {
      AddPlanMessage: vi.fn().mockResolvedValue(undefined),
    };

    mockLLMChatProjection = {
      GetMessages: vi.fn().mockReturnValue(createMockChatMessages()),
      GetMessagesExcludingPlan: vi
        .fn()
        .mockReturnValue(createMockChatMessages()),
    };

    vi.mocked(d.PlanService).mockReturnValue(mockPlanService as any);
    vi.mocked(d.GrokChatAPI).mockReturnValue(mockGrokChatAPI as any);
    vi.mocked(d.ChatService).mockReturnValue(mockChatService as any);
    vi.mocked(d.LLMChatProjection).mockReturnValue(
      mockLLMChatProjection as any,
    );
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
      expect(mockChatService.AddPlanMessage).not.toHaveBeenCalled();
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
      expect(mockChatService.AddPlanMessage).toHaveBeenCalledTimes(1);
    });

    it("should increment counter for plans not due for refresh", async () => {
      const service = new PlanGenerationService(testChatId);
      const notDuePlan = createPlan({
        refreshInterval: 5,
        messagesSinceLastUpdate: 2,
      });
      mockPlanService.getPlans.mockReturnValue([notDuePlan]);

      await service.generateUpdatedPlans(createMockChatMessages());

      expect(mockPlanService.savePlans).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ messagesSinceLastUpdate: 3 }),
        ]),
      );
    });

    it("should reset counter for regenerated plans", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        refreshInterval: 3,
        messagesSinceLastUpdate: 3,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);

      await service.generateUpdatedPlans(createMockChatMessages());

      expect(mockPlanService.savePlans).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ messagesSinceLastUpdate: 0 }),
        ]),
      );
    });

    it("should store content as CQRS event via ChatService", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        id: "plan-1",
        name: "Story Plan",
        refreshInterval: 3,
        messagesSinceLastUpdate: 5,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);
      mockGrokChatAPI.postChat.mockResolvedValue("Fresh content");

      await service.generateUpdatedPlans(createMockChatMessages());

      expect(mockChatService.AddPlanMessage).toHaveBeenCalledWith(
        "plan-1",
        "Story Plan",
        "Fresh content",
      );
    });

    it("should not call ChatService for plans not due", async () => {
      const service = new PlanGenerationService(testChatId);
      const notDuePlan = createPlan({
        refreshInterval: 10,
        messagesSinceLastUpdate: 2,
      });
      mockPlanService.getPlans.mockReturnValue([notDuePlan]);

      await service.generateUpdatedPlans(createMockChatMessages());

      expect(mockChatService.AddPlanMessage).not.toHaveBeenCalled();
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

    it("should save updated plan counters via PlanService", async () => {
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

    it("should preserve plan metadata when saving counters", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        name: "Test Plan",
        prompt: "Test prompt",
        refreshInterval: 2,
        messagesSinceLastUpdate: 2,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.generateUpdatedPlans(createMockChatMessages());

      expect(mockPlanService.savePlans).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "plan-1",
          type: "planning",
          name: "Test Plan",
          prompt: "Test prompt",
          refreshInterval: 2,
          messagesSinceLastUpdate: 0,
        }),
      ]);
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
        id: "overdue",
        name: "Overdue Plan",
        refreshInterval: 3,
        messagesSinceLastUpdate: 10,
      });
      mockPlanService.getPlans.mockReturnValue([overduePlan]);
      mockGrokChatAPI.postChat.mockResolvedValue("Refreshed");

      await service.generateUpdatedPlans(createMockChatMessages());

      expect(mockChatService.AddPlanMessage).toHaveBeenCalledWith(
        "overdue",
        "Overdue Plan",
        "Refreshed",
      );
      expect(mockPlanService.savePlans).toHaveBeenCalledWith([
        expect.objectContaining({ messagesSinceLastUpdate: 0 }),
      ]);
    });

    it("should handle mix of due and not-due plans correctly", async () => {
      const service = new PlanGenerationService(testChatId);
      const plans = [
        createPlan({
          id: "due-1",
          name: "Due 1",
          refreshInterval: 2,
          messagesSinceLastUpdate: 2,
        }),
        createPlan({
          id: "not-due",
          refreshInterval: 5,
          messagesSinceLastUpdate: 1,
        }),
        createPlan({
          id: "due-2",
          name: "Due 2",
          refreshInterval: 3,
          messagesSinceLastUpdate: 4,
        }),
      ];
      mockPlanService.getPlans.mockReturnValue(plans);
      mockGrokChatAPI.postChat
        .mockResolvedValueOnce("New content 1")
        .mockResolvedValueOnce("New content 2");

      await service.generateUpdatedPlans(createMockChatMessages());

      expect(mockGrokChatAPI.postChat).toHaveBeenCalledTimes(2);
      expect(mockChatService.AddPlanMessage).toHaveBeenCalledTimes(2);
      expect(mockPlanService.savePlans).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "due-1",
            messagesSinceLastUpdate: 0,
          }),
          expect.objectContaining({
            id: "not-due",
            messagesSinceLastUpdate: 2,
          }),
          expect.objectContaining({
            id: "due-2",
            messagesSinceLastUpdate: 0,
          }),
        ]),
      );
    });
  });

  // ---- generatePlanNow Tests ----
  describe("generatePlanNow", () => {
    it("should generate plan regardless of refresh cadence", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        name: "My Plan",
        refreshInterval: 100,
        messagesSinceLastUpdate: 0,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);
      mockGrokChatAPI.postChat.mockResolvedValue("On demand content");

      await service.generatePlanNow("plan-1");

      expect(mockChatService.AddPlanMessage).toHaveBeenCalledWith(
        "plan-1",
        "My Plan",
        "On demand content",
      );
    });

    it("should reset message counter after generation", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        messagesSinceLastUpdate: 42,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.generatePlanNow("plan-1");

      expect(mockPlanService.savePlans).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "plan-1",
          messagesSinceLastUpdate: 0,
        }),
      ]);
    });

    it("should do nothing if plan not found", async () => {
      const service = new PlanGenerationService(testChatId);
      mockPlanService.getPlans.mockReturnValue([]);

      await service.generatePlanNow("nonexistent");

      expect(mockGrokChatAPI.postChat).not.toHaveBeenCalled();
      expect(mockChatService.AddPlanMessage).not.toHaveBeenCalled();
    });

    it("should use LLMChatProjection for chat messages", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.generatePlanNow("plan-1");

      expect(d.LLMChatProjection).toHaveBeenCalledWith(testChatId);
      expect(mockLLMChatProjection.GetMessages).toHaveBeenCalled();
    });

    it("should not affect other plans' counters", async () => {
      const service = new PlanGenerationService(testChatId);
      const plans = [
        createPlan({ id: "target", messagesSinceLastUpdate: 3 }),
        createPlan({ id: "other", messagesSinceLastUpdate: 7 }),
      ];
      mockPlanService.getPlans.mockReturnValue(plans);

      await service.generatePlanNow("target");

      expect(mockPlanService.savePlans).toHaveBeenCalledWith([
        expect.objectContaining({ id: "target", messagesSinceLastUpdate: 0 }),
        expect.objectContaining({ id: "other", messagesSinceLastUpdate: 7 }),
      ]);
    });
  });

  // ---- regeneratePlanFromMessage Tests ----
  describe("regeneratePlanFromMessage", () => {
    it("should do nothing when plan definition is not found", async () => {
      const service = new PlanGenerationService(testChatId);
      mockPlanService.getPlans.mockReturnValue([]);

      await service.regeneratePlanFromMessage("nonexistent-id", "old content");

      expect(mockGrokChatAPI.postChat).not.toHaveBeenCalled();
      expect(mockChatService.AddPlanMessage).not.toHaveBeenCalled();
    });

    it("should get chat messages excluding the plan being regenerated", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.regeneratePlanFromMessage("plan-1", "old content");

      expect(
        mockLLMChatProjection.GetMessagesExcludingPlan,
      ).toHaveBeenCalledWith("plan-1");
    });

    it("should use update prompt with prior content when priorContent is provided", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        name: "Story Plan",
        prompt: "Analyze the story",
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.regeneratePlanFromMessage(
        "plan-1",
        "Prior plan content here",
      );

      const callArgs = mockGrokChatAPI.postChat.mock.calls[0][0];
      const lastMessage = callArgs[callArgs.length - 1];
      expect(lastMessage.content).toContain("Story Plan");
      expect(lastMessage.content).toContain("current version of this plan");
      expect(lastMessage.content).toContain("Prior plan content here");
      expect(lastMessage.content).toContain("Update the plan in Markdown");
      expect(lastMessage.content).toContain("Analyze the story");
    });

    it("should include user feedback in the prompt when provided", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1", name: "Story Plan" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.regeneratePlanFromMessage(
        "plan-1",
        "Prior plan content",
        "Focus more on character arcs",
      );

      const callArgs = mockGrokChatAPI.postChat.mock.calls[0][0];
      const lastMessage = callArgs[callArgs.length - 1];
      expect(lastMessage.content).toContain("User feedback on what to change:");
      expect(lastMessage.content).toContain("Focus more on character arcs");
    });

    it("should not include feedback section when no feedback provided", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.regeneratePlanFromMessage("plan-1", "Prior plan content");

      const callArgs = mockGrokChatAPI.postChat.mock.calls[0][0];
      const lastMessage = callArgs[callArgs.length - 1];
      expect(lastMessage.content).not.toContain(
        "User feedback on what to change:",
      );
    });

    it("should not include feedback section when feedback is blank", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.regeneratePlanFromMessage(
        "plan-1",
        "Prior plan content",
        "   ",
      );

      const callArgs = mockGrokChatAPI.postChat.mock.calls[0][0];
      const lastMessage = callArgs[callArgs.length - 1];
      expect(lastMessage.content).not.toContain(
        "User feedback on what to change:",
      );
    });

    it("should use fresh generate prompt when no priorContent provided", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        name: "Story Plan",
        prompt: "Analyze the story",
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.regeneratePlanFromMessage("plan-1");

      const callArgs = mockGrokChatAPI.postChat.mock.calls[0][0];
      const lastMessage = callArgs[callArgs.length - 1];
      expect(lastMessage.content).toContain("Story Plan");
      expect(lastMessage.content).toContain("Generate a plan in Markdown");
      expect(lastMessage.content).not.toContain("current version of this plan");
    });

    it("should store generated content as CQRS event via ChatService", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1", name: "Story Plan" });
      mockPlanService.getPlans.mockReturnValue([plan]);
      mockGrokChatAPI.postChat.mockResolvedValue("Regenerated plan content");

      await service.regeneratePlanFromMessage("plan-1", "Old content");

      expect(mockChatService.AddPlanMessage).toHaveBeenCalledWith(
        "plan-1",
        "Story Plan",
        "Regenerated plan content",
      );
    });

    it("should strip markdown code fences from regenerated content", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1", name: "Story Plan" });
      mockPlanService.getPlans.mockReturnValue([plan]);
      mockGrokChatAPI.postChat.mockResolvedValue(
        "```markdown\n### Updated Plan\nContent here\n```",
      );

      await service.regeneratePlanFromMessage("plan-1", "Old content");

      expect(mockChatService.AddPlanMessage).toHaveBeenCalledWith(
        "plan-1",
        "Story Plan",
        "### Updated Plan\nContent here",
      );
    });

    it("should include chat context messages in the LLM request", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.regeneratePlanFromMessage("plan-1", "Old content");

      const callArgs = mockGrokChatAPI.postChat.mock.calls[0][0];
      expect(callArgs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ content: "Hello" }),
          expect.objectContaining({ content: "Hi there!" }),
        ]),
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

  // ---- Markdown Code Fence Stripping ----
  describe("markdown code fence stripping", () => {
    it("should strip ```markdown wrapper from LLM response", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        refreshInterval: 1,
        messagesSinceLastUpdate: 1,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);
      mockGrokChatAPI.postChat.mockResolvedValue(
        "```markdown\n### Plan\nContent here\n```",
      );

      await service.generateUpdatedPlans(createMockChatMessages());

      expect(mockChatService.AddPlanMessage).toHaveBeenCalledWith(
        plan.id,
        plan.name,
        "### Plan\nContent here",
      );
    });

    it("should strip bare ``` wrapper without language tag", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        refreshInterval: 1,
        messagesSinceLastUpdate: 1,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);
      mockGrokChatAPI.postChat.mockResolvedValue("```\n# Title\nBody\n```");

      await service.generateUpdatedPlans(createMockChatMessages());

      expect(mockChatService.AddPlanMessage).toHaveBeenCalledWith(
        plan.id,
        plan.name,
        "# Title\nBody",
      );
    });

    it("should leave content unchanged when no code fence present", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        refreshInterval: 1,
        messagesSinceLastUpdate: 1,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);
      mockGrokChatAPI.postChat.mockResolvedValue("### Plan\nContent here");

      await service.generateUpdatedPlans(createMockChatMessages());

      expect(mockChatService.AddPlanMessage).toHaveBeenCalledWith(
        plan.id,
        plan.name,
        "### Plan\nContent here",
      );
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
      refreshInterval: 5,
      messagesSinceLastUpdate: 0,
      ...overrides,
    };
  }
});
