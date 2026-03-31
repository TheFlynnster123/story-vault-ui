import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PlanGenerationService } from "./PlanGenerationService";
import type { Plan } from "./Plan";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";

vi.mock("../../../services/Dependencies");

/** Let fire-and-forget promises inside onMessageSent settle. */
const flushPromises = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("PlanGenerationService", () => {
  const testChatId = "test-chat-123";

  let mockPlanService: {
    getPlans: ReturnType<typeof vi.fn>;
    savePlans: ReturnType<typeof vi.fn>;
    Plans: Plan[];
  };

  let mockOpenRouterChatAPI: {
    postChat: ReturnType<typeof vi.fn>;
  };

  let mockChatService: {
    AddPlanMessage: ReturnType<typeof vi.fn>;
  };

  let mockLLMChatProjection: {
    GetMessages: ReturnType<typeof vi.fn>;
    GetMessagesExcludingPlan: ReturnType<typeof vi.fn>;
    GetMessagesExcludingAllPlans: ReturnType<typeof vi.fn>;
  };

  let mockErrorService: {
    log: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPlanService = {
      getPlans: vi.fn().mockReturnValue([]),
      savePlans: vi.fn().mockResolvedValue(undefined),
      Plans: [],
    };

    mockOpenRouterChatAPI = {
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
      GetMessagesExcludingAllPlans: vi
        .fn()
        .mockReturnValue(createMockChatMessages()),
    };

    mockErrorService = {
      log: vi.fn(),
    };

    vi.mocked(d.PlanService).mockReturnValue(mockPlanService as any);
    vi.mocked(d.OpenRouterChatAPI).mockReturnValue(
      mockOpenRouterChatAPI as any,
    );
    vi.mocked(d.ChatService).mockReturnValue(mockChatService as any);
    vi.mocked(d.LLMChatProjection).mockReturnValue(
      mockLLMChatProjection as any,
    );
    vi.mocked(d.ErrorService).mockReturnValue(mockErrorService as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---- onMessageSent Tests ----
  describe("onMessageSent", () => {
    it("should do nothing when there are no plans", async () => {
      const service = new PlanGenerationService(testChatId);
      mockPlanService.getPlans.mockReturnValue([]);

      service.onMessageSent();
      await flushPromises();

      expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
      expect(mockChatService.AddPlanMessage).not.toHaveBeenCalled();
    });

    it("should only regenerate plans that are due for refresh", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        id: "due",
        refreshInterval: 3,
        messagesSinceLastUpdate: 2,
      });
      const notDuePlan = createPlan({
        id: "not-due",
        refreshInterval: 5,
        messagesSinceLastUpdate: 2,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan, notDuePlan]);

      service.onMessageSent();
      await flushPromises();

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledTimes(1);
      expect(mockChatService.AddPlanMessage).toHaveBeenCalledTimes(1);
    });

    it("should increment counter for plans not due for refresh", async () => {
      const service = new PlanGenerationService(testChatId);
      const notDuePlan = createPlan({
        refreshInterval: 5,
        messagesSinceLastUpdate: 2,
      });
      mockPlanService.getPlans.mockReturnValue([notDuePlan]);

      service.onMessageSent();
      await flushPromises();

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
        messagesSinceLastUpdate: 2,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);

      service.onMessageSent();
      await flushPromises();

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
        messagesSinceLastUpdate: 4,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Fresh content");

      service.onMessageSent();
      await flushPromises();

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

      service.onMessageSent();
      await flushPromises();

      expect(mockChatService.AddPlanMessage).not.toHaveBeenCalled();
      expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
    });

    it("should include chat messages and plan prompt in LLM request", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        name: "My Plan",
        prompt: "Analyze the story",
        refreshInterval: 1,
        messagesSinceLastUpdate: 0,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);

      service.onMessageSent();
      await flushPromises();

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
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
        messagesSinceLastUpdate: 0,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);

      service.onMessageSent();
      await flushPromises();

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      const lastMessage = callArgs[callArgs.length - 1];
      expect(lastMessage.content).not.toContain("~");
      expect(lastMessage.content).not.toContain("=====");
      expect(lastMessage.content).toContain(
        "Generate a plan in Markdown. No preamble or additional commentary.",
      );
    });

    it("should save incremented counters immediately via PlanService", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        id: "due",
        refreshInterval: 1,
        messagesSinceLastUpdate: 0,
      });
      const notDuePlan = createPlan({
        id: "not-due",
        refreshInterval: 10,
        messagesSinceLastUpdate: 0,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan, notDuePlan]);

      service.onMessageSent();
      await flushPromises();

      expect(mockPlanService.savePlans).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "due", messagesSinceLastUpdate: 1 }),
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
        messagesSinceLastUpdate: 1,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      service.onMessageSent();
      await flushPromises();

      expect(mockPlanService.savePlans).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "plan-1",
          type: "planning",
          name: "Test Plan",
          prompt: "Test prompt",
          refreshInterval: 2,
          messagesSinceLastUpdate: 2,
        }),
      ]);
    });

    it("should process all due plans in parallel", async () => {
      const service = new PlanGenerationService(testChatId);
      const plans = [
        createPlan({
          id: "plan-1",
          refreshInterval: 1,
          messagesSinceLastUpdate: 0,
        }),
        createPlan({
          id: "plan-2",
          refreshInterval: 1,
          messagesSinceLastUpdate: 0,
        }),
      ];
      mockPlanService.getPlans.mockReturnValue(plans);
      mockOpenRouterChatAPI.postChat.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve("Generated"), 10)),
      );

      const start = Date.now();
      service.onMessageSent();
      await flushPromises();
      // Wait a bit more for the setTimeout-based mocks to resolve
      await new Promise((resolve) => setTimeout(resolve, 20));
      const elapsed = Date.now() - start;

      // If sequential, would take ~20ms. Parallel should be closer to ~10ms.
      expect(elapsed).toBeLessThan(28);
    });

    it("should regenerate plan when counter exceeds interval", async () => {
      const service = new PlanGenerationService(testChatId);
      const overduePlan = createPlan({
        id: "overdue",
        name: "Overdue Plan",
        refreshInterval: 3,
        messagesSinceLastUpdate: 9,
      });
      mockPlanService.getPlans.mockReturnValue([overduePlan]);
      mockOpenRouterChatAPI.postChat.mockResolvedValue("Refreshed");

      service.onMessageSent();
      await flushPromises();

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
          messagesSinceLastUpdate: 1,
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
          messagesSinceLastUpdate: 3,
        }),
      ];
      mockPlanService.getPlans.mockReturnValue(plans);
      mockOpenRouterChatAPI.postChat
        .mockResolvedValueOnce("New content 1")
        .mockResolvedValueOnce("New content 2");

      service.onMessageSent();
      await flushPromises();

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledTimes(2);
      expect(mockChatService.AddPlanMessage).toHaveBeenCalledTimes(2);
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
      mockOpenRouterChatAPI.postChat.mockResolvedValue("On demand content");

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

      expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
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

      expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
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

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
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

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      const lastMessage = callArgs[callArgs.length - 1];
      expect(lastMessage.content).toContain("User feedback on what to change:");
      expect(lastMessage.content).toContain("Focus more on character arcs");
    });

    it("should not include feedback section when no feedback provided", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.regeneratePlanFromMessage("plan-1", "Prior plan content");

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
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

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
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

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      const lastMessage = callArgs[callArgs.length - 1];
      expect(lastMessage.content).toContain("Story Plan");
      expect(lastMessage.content).toContain("Generate a plan in Markdown");
      expect(lastMessage.content).not.toContain("current version of this plan");
    });

    it("should store generated content as CQRS event via ChatService", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1", name: "Story Plan" });
      mockPlanService.getPlans.mockReturnValue([plan]);
      mockOpenRouterChatAPI.postChat.mockResolvedValue(
        "Regenerated plan content",
      );

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
      mockOpenRouterChatAPI.postChat.mockResolvedValue(
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

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      expect(callArgs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ content: "Hello" }),
          expect.objectContaining({ content: "Hi there!" }),
        ]),
      );
    });
  });

  // ---- onMessageSent due-plan detection ----
  describe("onMessageSent due-plan detection", () => {
    it("should not trigger regeneration when no plans exist", async () => {
      const service = new PlanGenerationService(testChatId);
      mockPlanService.getPlans.mockReturnValue([]);

      service.onMessageSent();
      await flushPromises();

      expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
    });

    it("should trigger regeneration when at least one plan becomes due after increment", async () => {
      const service = new PlanGenerationService(testChatId);
      mockPlanService.getPlans.mockReturnValue([
        createPlan({ refreshInterval: 3, messagesSinceLastUpdate: 2 }),
      ]);

      service.onMessageSent();
      await flushPromises();

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledTimes(1);
    });

    it("should not trigger regeneration when no plans are due after increment", async () => {
      const service = new PlanGenerationService(testChatId);
      mockPlanService.getPlans.mockReturnValue([
        createPlan({ refreshInterval: 5, messagesSinceLastUpdate: 2 }),
        createPlan({ refreshInterval: 10, messagesSinceLastUpdate: 0 }),
      ]);

      service.onMessageSent();
      await flushPromises();

      expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
    });

    it("should trigger regeneration when one of many plans becomes due", async () => {
      const service = new PlanGenerationService(testChatId);
      mockPlanService.getPlans.mockReturnValue([
        createPlan({ refreshInterval: 10, messagesSinceLastUpdate: 1 }),
        createPlan({ refreshInterval: 3, messagesSinceLastUpdate: 4 }),
        createPlan({ refreshInterval: 20, messagesSinceLastUpdate: 0 }),
      ]);

      service.onMessageSent();
      await flushPromises();

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledTimes(1);
    });
  });

  // ---- Markdown Code Fence Stripping ----
  describe("markdown code fence stripping", () => {
    it("should strip ```markdown wrapper from LLM response", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        refreshInterval: 1,
        messagesSinceLastUpdate: 0,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);
      mockOpenRouterChatAPI.postChat.mockResolvedValue(
        "```markdown\n### Plan\nContent here\n```",
      );

      service.onMessageSent();
      await flushPromises();

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
        messagesSinceLastUpdate: 0,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);
      mockOpenRouterChatAPI.postChat.mockResolvedValue(
        "```\n# Title\nBody\n```",
      );

      service.onMessageSent();
      await flushPromises();

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
        messagesSinceLastUpdate: 0,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);
      mockOpenRouterChatAPI.postChat.mockResolvedValue(
        "### Plan\nContent here",
      );

      service.onMessageSent();
      await flushPromises();

      expect(mockChatService.AddPlanMessage).toHaveBeenCalledWith(
        plan.id,
        plan.name,
        "### Plan\nContent here",
      );
    });
  });

  // ---- Generation State Tracking Tests ----
  describe("generation state tracking", () => {
    it("should report plan as generating during generatePlanNow", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      let wasGeneratingDuringCall = false;
      mockOpenRouterChatAPI.postChat.mockImplementation(async () => {
        wasGeneratingDuringCall = service.isGenerating("plan-1");
        return "content";
      });

      await service.generatePlanNow("plan-1");

      expect(wasGeneratingDuringCall).toBe(true);
      expect(service.isGenerating("plan-1")).toBe(false);
    });

    it("should report plan as generating during regeneratePlanFromMessage", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      let wasGeneratingDuringCall = false;
      mockOpenRouterChatAPI.postChat.mockImplementation(async () => {
        wasGeneratingDuringCall = service.isGenerating("plan-1");
        return "content";
      });

      await service.regeneratePlanFromMessage("plan-1", "prior content");

      expect(wasGeneratingDuringCall).toBe(true);
      expect(service.isGenerating("plan-1")).toBe(false);
    });

    it("should report plan as generating during cadence-based update", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        id: "due-plan",
        refreshInterval: 1,
        messagesSinceLastUpdate: 0,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);

      let wasGeneratingDuringCall = false;
      mockOpenRouterChatAPI.postChat.mockImplementation(async () => {
        wasGeneratingDuringCall = service.isGenerating("due-plan");
        return "content";
      });

      service.onMessageSent();
      await flushPromises();

      expect(wasGeneratingDuringCall).toBe(true);
      expect(service.isGenerating("due-plan")).toBe(false);
    });

    it("should notify subscribers when generation starts and ends", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      const subscriber = vi.fn();
      service.subscribe(subscriber);

      await service.generatePlanNow("plan-1");

      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it("should clear generating state even on error", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1" });
      mockPlanService.getPlans.mockReturnValue([plan]);
      mockOpenRouterChatAPI.postChat.mockRejectedValue(new Error("API error"));

      await expect(service.generatePlanNow("plan-1")).rejects.toThrow(
        "API error",
      );

      expect(service.isGenerating("plan-1")).toBe(false);
    });

    it("should unsubscribe correctly", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      const subscriber = vi.fn();
      const unsubscribe = service.subscribe(subscriber);
      unsubscribe();

      await service.generatePlanNow("plan-1");

      expect(subscriber).not.toHaveBeenCalled();
    });

    it("should expose generating plan IDs via getGeneratingPlanIds", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      let capturedIds: string[] = [];
      mockOpenRouterChatAPI.postChat.mockImplementation(async () => {
        capturedIds = [...service.getGeneratingPlanIds()];
        return "content";
      });

      await service.generatePlanNow("plan-1");

      expect(capturedIds).toContain("plan-1");
      expect(service.getGeneratingPlanIds().size).toBe(0);
    });
  });

  // ---- Consolidate Message History Tests ----
  describe("consolidateMessageHistory", () => {
    it("should send messages as JSON array when consolidateMessageHistory is false", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        consolidateMessageHistory: false,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.generatePlanNow("plan-1");

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      // Should have multiple messages (chat messages + system message)
      expect(callArgs.length).toBeGreaterThan(1);
      // First message should be from the chat history
      expect(callArgs[0]).toEqual({ id: "msg-1", role: "user", content: "Hello" });
    });

    it("should consolidate messages into a single string when consolidateMessageHistory is true", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        name: "Consolidated Plan",
        prompt: "Analyze this",
        consolidateMessageHistory: true,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.generatePlanNow("plan-1");

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      // Should have only one system message with consolidated content
      expect(callArgs.length).toBe(1);
      expect(callArgs[0].role).toBe("system");
      expect(callArgs[0].content).toContain("Chat History:");
      expect(callArgs[0].content).toContain("User: Hello");
      expect(callArgs[0].content).toContain("Assistant: Hi there!");
      expect(callArgs[0].content).toContain("# Consolidated Plan");
      expect(callArgs[0].content).toContain("Analyze this");
    });

    it("should use consolidation for regeneratePlanFromMessage with prior content", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        name: "Update Plan",
        consolidateMessageHistory: true,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.regeneratePlanFromMessage(
        "plan-1",
        "Prior plan content",
        "Some feedback",
      );

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      expect(callArgs.length).toBe(1);
      expect(callArgs[0].role).toBe("system");
      expect(callArgs[0].content).toContain("Chat History:");
      expect(callArgs[0].content).toContain("User: Hello");
      expect(callArgs[0].content).toContain("current version of this plan");
      expect(callArgs[0].content).toContain("Prior plan content");
      expect(callArgs[0].content).toContain("Some feedback");
    });

    it("should format consolidation with proper role labels", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        consolidateMessageHistory: true,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      mockLLMChatProjection.GetMessages.mockReturnValue([
        { id: "1", role: "user", content: "User message" },
        { id: "2", role: "assistant", content: "Assistant response" },
        { id: "3", role: "system", content: "System note" },
      ]);

      await service.generatePlanNow("plan-1");

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      const content = callArgs[0].content;
      expect(content).toContain("User: User message");
      expect(content).toContain("Assistant: Assistant response");
      expect(content).toContain("System: System note");
    });

    it("should work with consolidation in cadence-based regeneration", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        id: "plan-1",
        consolidateMessageHistory: true,
        refreshInterval: 1,
        messagesSinceLastUpdate: 0,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);

      service.onMessageSent();
      await flushPromises();

      const callArgs = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      expect(callArgs.length).toBe(1);
      expect(callArgs[0].role).toBe("system");
      expect(callArgs[0].content).toContain("Chat History:");
    });
  });

  // ---- Per-Plan Model Override Tests ----
  describe("per-plan model override", () => {
    it("should pass plan model to postChat for generatePlanNow", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1", model: "anthropic/claude-opus-4" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.generatePlanNow("plan-1");

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        "anthropic/claude-opus-4",
      );
    });

    it("should pass undefined when plan has no model", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.generatePlanNow("plan-1");

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });

    it("should pass undefined when plan model is empty string", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1", model: "" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.generatePlanNow("plan-1");

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });

    it("should pass plan model to postChat for regeneratePlanFromMessage", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({ id: "plan-1", model: "openai/gpt-5" });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.regeneratePlanFromMessage("plan-1", "prior content");

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        "openai/gpt-5",
      );
    });

    it("should pass plan model for cadence-based regeneration", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        id: "plan-1",
        model: "google/gemini-2.5-pro",
        refreshInterval: 1,
        messagesSinceLastUpdate: 0,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);

      service.onMessageSent();
      await flushPromises();

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        "google/gemini-2.5-pro",
      );
    });
  });

  // ---- Hide Other Plans Tests ----
  describe("hideOtherPlans", () => {
    it("should use GetMessagesExcludingAllPlans when hideOtherPlans is true", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        hideOtherPlans: true,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.generatePlanNow("plan-1");

      expect(mockLLMChatProjection.GetMessagesExcludingAllPlans).toHaveBeenCalled();
      expect(mockLLMChatProjection.GetMessages).not.toHaveBeenCalled();
    });

    it("should use GetMessages when hideOtherPlans is false", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        hideOtherPlans: false,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.generatePlanNow("plan-1");

      expect(mockLLMChatProjection.GetMessages).toHaveBeenCalled();
      expect(mockLLMChatProjection.GetMessagesExcludingAllPlans).not.toHaveBeenCalled();
    });

    it("should use GetMessagesExcludingAllPlans for regeneratePlanFromMessage when hideOtherPlans is true", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        hideOtherPlans: true,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.regeneratePlanFromMessage("plan-1", "prior content");

      expect(mockLLMChatProjection.GetMessagesExcludingAllPlans).toHaveBeenCalled();
      expect(mockLLMChatProjection.GetMessagesExcludingPlan).not.toHaveBeenCalled();
    });

    it("should use GetMessagesExcludingPlan for regeneratePlanFromMessage when hideOtherPlans is false", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        hideOtherPlans: false,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.regeneratePlanFromMessage("plan-1", "prior content");

      expect(mockLLMChatProjection.GetMessagesExcludingPlan).toHaveBeenCalledWith("plan-1");
      expect(mockLLMChatProjection.GetMessagesExcludingAllPlans).not.toHaveBeenCalled();
    });

    it("should use GetMessagesExcludingAllPlans for cadence-based regeneration when hideOtherPlans is true", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        id: "plan-1",
        hideOtherPlans: true,
        refreshInterval: 1,
        messagesSinceLastUpdate: 0,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);

      service.onMessageSent();
      await flushPromises();

      expect(mockLLMChatProjection.GetMessagesExcludingAllPlans).toHaveBeenCalled();
    });

    it("should use GetMessages for cadence-based regeneration when hideOtherPlans is false", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        id: "plan-1",
        hideOtherPlans: false,
        refreshInterval: 1,
        messagesSinceLastUpdate: 0,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);

      service.onMessageSent();
      await flushPromises();

      expect(mockLLMChatProjection.GetMessages).toHaveBeenCalled();
      expect(mockLLMChatProjection.GetMessagesExcludingAllPlans).not.toHaveBeenCalled();
    });
  });

  // ---- Exclude Own Plan From History Tests ----
  describe("excludeOwnPlanFromHistory", () => {
    it("should use GetMessagesExcludingPlan when excludeOwnPlanFromHistory is true", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        excludeOwnPlanFromHistory: true,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.generatePlanNow("plan-1");

      expect(mockLLMChatProjection.GetMessagesExcludingPlan).toHaveBeenCalledWith("plan-1");
      expect(mockLLMChatProjection.GetMessages).not.toHaveBeenCalled();
    });

    it("should use GetMessages when excludeOwnPlanFromHistory is false", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        excludeOwnPlanFromHistory: false,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.generatePlanNow("plan-1");

      expect(mockLLMChatProjection.GetMessages).toHaveBeenCalled();
      expect(mockLLMChatProjection.GetMessagesExcludingPlan).not.toHaveBeenCalled();
    });

    it("should use GetMessagesExcludingPlan for cadence-based regeneration when excludeOwnPlanFromHistory is true", async () => {
      const service = new PlanGenerationService(testChatId);
      const duePlan = createPlan({
        id: "plan-1",
        excludeOwnPlanFromHistory: true,
        refreshInterval: 1,
        messagesSinceLastUpdate: 0,
      });
      mockPlanService.getPlans.mockReturnValue([duePlan]);

      service.onMessageSent();
      await flushPromises();

      expect(mockLLMChatProjection.GetMessagesExcludingPlan).toHaveBeenCalledWith("plan-1");
      expect(mockLLMChatProjection.GetMessages).not.toHaveBeenCalled();
    });

    it("should prioritize hideOtherPlans over excludeOwnPlanFromHistory", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createPlan({
        id: "plan-1",
        hideOtherPlans: true,
        excludeOwnPlanFromHistory: true,
      });
      mockPlanService.getPlans.mockReturnValue([plan]);

      await service.generatePlanNow("plan-1");

      // Should use GetMessagesExcludingAllPlans when hideOtherPlans is true
      expect(mockLLMChatProjection.GetMessagesExcludingAllPlans).toHaveBeenCalled();
      expect(mockLLMChatProjection.GetMessagesExcludingPlan).not.toHaveBeenCalled();
      expect(mockLLMChatProjection.GetMessages).not.toHaveBeenCalled();
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
      consolidateMessageHistory: false,
      hideOtherPlans: false,
      excludeOwnPlanFromHistory: false,
      ...overrides,
    };
  }
});
