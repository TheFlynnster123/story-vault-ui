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

    it("should generate content for each plan", async () => {
      const service = new PlanGenerationService(testChatId);
      const plans = createMockPlans();
      mockPlanService.getPlans.mockReturnValue(plans);
      mockGrokChatAPI.postChat
        .mockResolvedValueOnce("Updated content 1")
        .mockResolvedValueOnce("Updated content 2");

      const result = await service.generateUpdatedPlans(
        createMockChatMessages(),
      );

      expect(mockGrokChatAPI.postChat).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe("Updated content 1");
      expect(result[1].content).toBe("Updated content 2");
    });

    it("should include chat messages and plan prompt in LLM request", async () => {
      const service = new PlanGenerationService(testChatId);
      const plans = [createSinglePlan()];
      const chatMessages = createMockChatMessages();
      mockPlanService.getPlans.mockReturnValue(plans);

      await service.generateUpdatedPlans(chatMessages);

      const callArgs = mockGrokChatAPI.postChat.mock.calls[0][0];
      expect(callArgs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ content: "Hello" }),
          expect.objectContaining({ content: "Hi there!" }),
        ]),
      );
      const lastMessage = callArgs[callArgs.length - 1];
      expect(lastMessage.content).toContain("Test Plan");
      expect(lastMessage.content).toContain("Test prompt");
    });

    it("should save updated plans via PlanService", async () => {
      const service = new PlanGenerationService(testChatId);
      const plans = [createSinglePlan()];
      mockPlanService.getPlans.mockReturnValue(plans);
      mockGrokChatAPI.postChat.mockResolvedValue("New content");

      await service.generateUpdatedPlans(createMockChatMessages());

      expect(mockPlanService.savePlans).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ content: "New content" }),
        ]),
      );
    });

    it("should preserve plan metadata while updating content", async () => {
      const service = new PlanGenerationService(testChatId);
      const plan = createSinglePlan();
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
      });
    });

    it("should process all plans in parallel", async () => {
      const service = new PlanGenerationService(testChatId);
      const plans = createMockPlans();
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
  });

  // ---- Helper Functions ----
  function createMockChatMessages(): LLMMessage[] {
    return [
      { id: "msg-1", role: "user", content: "Hello" },
      { id: "msg-2", role: "assistant", content: "Hi there!" },
    ];
  }

  function createMockPlans(): Plan[] {
    return [
      {
        id: "plan-1",
        type: "planning",
        name: "Plan 1",
        prompt: "Prompt 1",
        content: "Content 1",
      },
      {
        id: "plan-2",
        type: "planning",
        name: "Plan 2",
        prompt: "Prompt 2",
        content: "Content 2",
      },
    ];
  }

  function createSinglePlan(): Plan {
    return {
      id: "plan-1",
      type: "planning",
      name: "Test Plan",
      prompt: "Test prompt",
      content: "Old content",
    };
  }
});
