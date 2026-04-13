import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StoryDirectionService } from "./StoryDirectionService";
import type { Plan } from "./Plan";
import { d } from "../../../services/Dependencies";

vi.mock("../../../services/Dependencies");

const flushPromises = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("StoryDirectionService", () => {
  const testChatId = "test-chat-123";
  const testPlanId = "plan-001";

  let mockPlanService: {
    getPlans: ReturnType<typeof vi.fn>;
  };

  let mockOpenRouterChatAPI: {
    postChat: ReturnType<typeof vi.fn>;
  };

  let mockPlanGenerationService: {
    regeneratePlanFromMessage: ReturnType<typeof vi.fn>;
  };

  let mockLLMChatProjection: {
    GetMessages: ReturnType<typeof vi.fn>;
    GetMessagesExcludingPlan: ReturnType<typeof vi.fn>;
    GetMessagesExcludingAllPlans: ReturnType<typeof vi.fn>;
  };

  let mockErrorService: {
    log: ReturnType<typeof vi.fn>;
  };

  const defaultPlan: Plan = {
    id: testPlanId,
    type: "planning",
    name: "Story Plan",
    prompt: "Generate a plan",
    refreshInterval: 5,
    messagesSinceLastUpdate: 0,
    consolidateMessageHistory: false,
    hideOtherPlans: false,
    excludeOwnPlanFromHistory: false,
  };

  beforeEach(() => {
    mockPlanService = {
      getPlans: vi.fn().mockReturnValue([defaultPlan]),
    };

    mockOpenRouterChatAPI = {
      postChat: vi.fn().mockResolvedValue("Great idea! A dragon could work."),
    };

    mockPlanGenerationService = {
      regeneratePlanFromMessage: vi.fn().mockResolvedValue(undefined),
    };

    mockLLMChatProjection = {
      GetMessages: vi.fn().mockReturnValue([
        { id: "msg-1", role: "user", content: "Hello" },
        { id: "msg-2", role: "assistant", content: "World" },
      ]),
      GetMessagesExcludingPlan: vi.fn().mockReturnValue([
        { id: "msg-1", role: "user", content: "Hello" },
        { id: "msg-2", role: "assistant", content: "World" },
      ]),
      GetMessagesExcludingAllPlans: vi.fn().mockReturnValue([
        { id: "msg-1", role: "user", content: "Hello" },
        { id: "msg-2", role: "assistant", content: "World" },
      ]),
    };

    mockErrorService = {
      log: vi.fn(),
    };

    vi.mocked(d.PlanService).mockReturnValue(mockPlanService as any);
    vi.mocked(d.OpenRouterChatAPI).mockReturnValue(
      mockOpenRouterChatAPI as any,
    );
    vi.mocked(d.PlanGenerationService).mockReturnValue(
      mockPlanGenerationService as any,
    );
    vi.mocked(d.LLMChatProjection).mockReturnValue(
      mockLLMChatProjection as any,
    );
    vi.mocked(d.ErrorService).mockReturnValue(mockErrorService as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("sendMessage", () => {
    it("should add user message and LLM response", async () => {
      const service = new StoryDirectionService(testChatId, testPlanId);

      await service.sendMessage("What about adding a dragon?");

      const messages = service.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({
        role: "user",
        content: "What about adding a dragon?",
      });
      expect(messages[1]).toEqual({
        role: "assistant",
        content: "Great idea! A dragon could work.",
      });
    });

    it("should not send empty messages", async () => {
      const service = new StoryDirectionService(testChatId, testPlanId);

      await service.sendMessage("   ");

      expect(service.getMessages()).toHaveLength(0);
      expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
    });

    it("should not send while already generating", async () => {
      mockOpenRouterChatAPI.postChat.mockImplementation(
        () => new Promise(() => {}),
      );

      const service = new StoryDirectionService(testChatId, testPlanId);
      service.sendMessage("First message");
      await flushPromises();

      expect(service.isGenerating()).toBe(true);
      await service.sendMessage("Second message");

      // Only the first user message should be added
      expect(
        service.getMessages().filter((m) => m.role === "user"),
      ).toHaveLength(1);
    });

    it("should notify subscribers during message lifecycle", async () => {
      const service = new StoryDirectionService(testChatId, testPlanId);
      const subscriber = vi.fn();
      service.subscribe(subscriber);

      await service.sendMessage("Hello!");

      // Should be called: once when user message added + generating=true,
      // then again when response received + generating=false
      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it("should handle LLM errors gracefully", async () => {
      mockOpenRouterChatAPI.postChat.mockRejectedValue(
        new Error("Network error"),
      );

      const service = new StoryDirectionService(testChatId, testPlanId);
      await service.sendMessage("Test message");

      const messages = service.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[1].role).toBe("assistant");
      expect(messages[1].content).toContain("error");
      expect(mockErrorService.log).toHaveBeenCalled();
    });

    it("should do nothing if plan is not found", async () => {
      mockPlanService.getPlans.mockReturnValue([]);

      const service = new StoryDirectionService(testChatId, testPlanId);
      await service.sendMessage("Test");

      expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
    });

    it("should include conversation history in LLM prompt", async () => {
      const service = new StoryDirectionService(testChatId, testPlanId);

      await service.sendMessage("First question");
      await service.sendMessage("Follow up");

      // Second call should include first Q&A pair in messages
      const secondCallMessages = mockOpenRouterChatAPI.postChat.mock.calls[1][0];
      const userMessages = secondCallMessages.filter(
        (m: any) => m.role === "user",
      );
      expect(userMessages.length).toBeGreaterThanOrEqual(2);
    });

    it("should use plan model override when set", async () => {
      const planWithModel: Plan = { ...defaultPlan, model: "custom-model" };
      mockPlanService.getPlans.mockReturnValue([planWithModel]);

      const service = new StoryDirectionService(testChatId, testPlanId);
      await service.sendMessage("Hello");

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        "custom-model",
      );
    });

    it("should exclude plan messages from context when hideOtherPlans is true", async () => {
      const planWithHide: Plan = { ...defaultPlan, hideOtherPlans: true };
      mockPlanService.getPlans.mockReturnValue([planWithHide]);

      const service = new StoryDirectionService(testChatId, testPlanId);
      await service.sendMessage("Hello");

      expect(
        mockLLMChatProjection.GetMessagesExcludingAllPlans,
      ).toHaveBeenCalled();
    });

    it("should exclude own plan messages from context by default", async () => {
      const service = new StoryDirectionService(testChatId, testPlanId);
      await service.sendMessage("Hello");

      expect(
        mockLLMChatProjection.GetMessagesExcludingPlan,
      ).toHaveBeenCalledWith(testPlanId);
    });
  });

  describe("generateUpdatedPlan", () => {
    it("should format conversation as feedback and regenerate plan", async () => {
      const service = new StoryDirectionService(testChatId, testPlanId);
      await service.sendMessage("Add a dragon!");

      await service.generateUpdatedPlan();

      expect(
        mockPlanGenerationService.regeneratePlanFromMessage,
      ).toHaveBeenCalledWith(
        testPlanId,
        undefined,
        expect.stringContaining("Add a dragon!"),
      );
    });

    it("should include both user and assistant messages in feedback", async () => {
      const service = new StoryDirectionService(testChatId, testPlanId);
      await service.sendMessage("What about a dragon?");

      await service.generateUpdatedPlan();

      const feedbackArg =
        mockPlanGenerationService.regeneratePlanFromMessage.mock.calls[0][2];
      expect(feedbackArg).toContain("User: What about a dragon?");
      expect(feedbackArg).toContain(
        "Assistant: Great idea! A dragon could work.",
      );
    });

    it("should do nothing if no messages have been sent", async () => {
      const service = new StoryDirectionService(testChatId, testPlanId);

      await service.generateUpdatedPlan();

      expect(
        mockPlanGenerationService.regeneratePlanFromMessage,
      ).not.toHaveBeenCalled();
    });

    it("should do nothing if plan is not found", async () => {
      mockPlanService.getPlans.mockReturnValue([]);

      const service = new StoryDirectionService(testChatId, testPlanId);
      // Manually add a message to bypass the plan check in sendMessage
      (service as any).messages = [{ role: "user", content: "test" }];

      await service.generateUpdatedPlan();

      expect(
        mockPlanGenerationService.regeneratePlanFromMessage,
      ).not.toHaveBeenCalled();
    });

    it("should notify subscribers during generation", async () => {
      const service = new StoryDirectionService(testChatId, testPlanId);
      await service.sendMessage("Test");

      const subscriber = vi.fn();
      service.subscribe(subscriber);

      await service.generateUpdatedPlan();

      // Called: generating=true, then generating=false
      expect(subscriber).toHaveBeenCalledTimes(2);
    });
  });

  describe("subscribe", () => {
    it("should return an unsubscribe function", async () => {
      const service = new StoryDirectionService(testChatId, testPlanId);
      const subscriber = vi.fn();

      const unsubscribe = service.subscribe(subscriber);
      await service.sendMessage("Test");
      const callCountBefore = subscriber.mock.calls.length;

      unsubscribe();
      await service.sendMessage("After unsubscribe");

      expect(subscriber).toHaveBeenCalledTimes(callCountBefore);
    });
  });

  describe("getMessages", () => {
    it("should return empty array initially", () => {
      const service = new StoryDirectionService(testChatId, testPlanId);
      expect(service.getMessages()).toEqual([]);
    });

    it("should return readonly array", async () => {
      const service = new StoryDirectionService(testChatId, testPlanId);
      await service.sendMessage("Hello");

      const messages = service.getMessages();
      expect(messages).toHaveLength(2);
    });
  });

  describe("isGenerating", () => {
    it("should be false initially", () => {
      const service = new StoryDirectionService(testChatId, testPlanId);
      expect(service.isGenerating()).toBe(false);
    });
  });
});
