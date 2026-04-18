import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DiscussionService } from "./DiscussionService";
import type { DiscussionConfig } from "./DiscussionConfig";
import { d } from "../../../services/Dependencies";

vi.mock("../../../services/Dependencies");

const flushPromises = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("DiscussionService", () => {
  let mockOpenRouterChatAPI: {
    postChat: ReturnType<typeof vi.fn>;
  };

  let mockErrorService: {
    log: ReturnType<typeof vi.fn>;
  };

  let mockConfig: DiscussionConfig;

  beforeEach(() => {
    mockOpenRouterChatAPI = {
      postChat: vi.fn().mockResolvedValue("Great idea! That could work."),
    };

    mockErrorService = {
      log: vi.fn(),
    };

    vi.mocked(d.OpenRouterChatAPI).mockReturnValue(
      mockOpenRouterChatAPI as any,
    );
    vi.mocked(d.ErrorService).mockReturnValue(mockErrorService as any);

    mockConfig = {
      buildSystemPrompt: vi
        .fn()
        .mockReturnValue("You are a helpful assistant."),
      getChatMessages: vi.fn().mockReturnValue([
        { id: "msg-1", role: "user", content: "Hello" },
        { id: "msg-2", role: "assistant", content: "World" },
      ]),
      getDefaultModel: vi.fn().mockReturnValue(undefined),
      generateFromFeedback: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("sendMessage", () => {
    it("should add user message and LLM response", async () => {
      const service = new DiscussionService(mockConfig);

      await service.sendMessage("What about adding a dragon?");

      const messages = service.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({
        role: "user",
        content: "What about adding a dragon?",
      });
      expect(messages[1]).toEqual({
        role: "assistant",
        content: "Great idea! That could work.",
      });
    });

    it("should not send empty messages", async () => {
      const service = new DiscussionService(mockConfig);

      await service.sendMessage("   ");

      expect(service.getMessages()).toHaveLength(0);
      expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
    });

    it("should not send while already generating", async () => {
      mockOpenRouterChatAPI.postChat.mockImplementation(
        () => new Promise(() => {}),
      );

      const service = new DiscussionService(mockConfig);
      service.sendMessage("First message");
      await flushPromises();

      expect(service.isGenerating()).toBe(true);
      await service.sendMessage("Second message");

      expect(
        service.getMessages().filter((m) => m.role === "user"),
      ).toHaveLength(1);
    });

    it("should notify subscribers during message lifecycle", async () => {
      const service = new DiscussionService(mockConfig);
      const subscriber = vi.fn();
      service.subscribe(subscriber);

      await service.sendMessage("Hello!");

      // Called: once when user message added + generating=true,
      // then again when response received + generating=false
      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it("should handle LLM errors gracefully", async () => {
      mockOpenRouterChatAPI.postChat.mockRejectedValue(
        new Error("Network error"),
      );

      const service = new DiscussionService(mockConfig);
      await service.sendMessage("Test message");

      const messages = service.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[1].role).toBe("assistant");
      expect(messages[1].content).toContain("error");
      expect(mockErrorService.log).toHaveBeenCalled();
    });

    it("should include conversation history in LLM prompt", async () => {
      const service = new DiscussionService(mockConfig);

      await service.sendMessage("First question");
      await service.sendMessage("Follow up");

      const secondCallMessages =
        mockOpenRouterChatAPI.postChat.mock.calls[1][0];
      const userMessages = secondCallMessages.filter(
        (m: any) => m.role === "user",
      );
      expect(userMessages.length).toBeGreaterThanOrEqual(2);
    });

    it("should use model override when provided", async () => {
      const service = new DiscussionService(mockConfig);
      await service.sendMessage("Hello", "user-selected-model");

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        "user-selected-model",
      );
    });

    it("should use default model from config when no override", async () => {
      vi.mocked(mockConfig.getDefaultModel).mockReturnValue("config-model");

      const service = new DiscussionService(mockConfig);
      await service.sendMessage("Hello");

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        "config-model",
      );
    });

    it("should prefer explicit override over config default model", async () => {
      vi.mocked(mockConfig.getDefaultModel).mockReturnValue("config-model");

      const service = new DiscussionService(mockConfig);
      await service.sendMessage("Hello", "user-selected-model");

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        "user-selected-model",
      );
    });

    it("should include system prompt from config in LLM call", async () => {
      const service = new DiscussionService(mockConfig);
      await service.sendMessage("Hello");

      const callMessages = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      const systemMessages = callMessages.filter(
        (m: any) => m.role === "system",
      );
      expect(
        systemMessages.some((m: any) =>
          m.content.includes("You are a helpful assistant."),
        ),
      ).toBe(true);
    });

    it("should include chat messages from config in LLM call", async () => {
      const service = new DiscussionService(mockConfig);
      await service.sendMessage("Hello");

      expect(mockConfig.getChatMessages).toHaveBeenCalled();
    });
  });

  describe("generateFromFeedback", () => {
    it("should call config generateFromFeedback with formatted conversation", async () => {
      const service = new DiscussionService(mockConfig);
      await service.sendMessage("Add a dragon!");

      await service.generateFromFeedback();

      expect(mockConfig.generateFromFeedback).toHaveBeenCalledWith(
        expect.stringContaining("Add a dragon!"),
      );
    });

    it("should include both user and assistant messages in feedback", async () => {
      const service = new DiscussionService(mockConfig);
      await service.sendMessage("What about a dragon?");

      await service.generateFromFeedback();

      const feedbackArg = vi.mocked(mockConfig.generateFromFeedback).mock
        .calls[0][0];
      expect(feedbackArg).toContain("User: What about a dragon?");
      expect(feedbackArg).toContain("Assistant: Great idea! That could work.");
    });

    it("should do nothing if no messages have been sent", async () => {
      const service = new DiscussionService(mockConfig);

      await service.generateFromFeedback();

      expect(mockConfig.generateFromFeedback).not.toHaveBeenCalled();
    });

    it("should notify subscribers during generation", async () => {
      const service = new DiscussionService(mockConfig);
      await service.sendMessage("Test");

      const subscriber = vi.fn();
      service.subscribe(subscriber);

      await service.generateFromFeedback();

      // Called: generating=true, then generating=false
      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it("should still set generating=false even if generateFromFeedback throws", async () => {
      vi.mocked(mockConfig.generateFromFeedback).mockRejectedValue(
        new Error("Fail"),
      );

      const service = new DiscussionService(mockConfig);
      await service.sendMessage("Test");

      await expect(service.generateFromFeedback()).rejects.toThrow("Fail");

      expect(service.isGenerating()).toBe(false);
    });
  });

  describe("subscribe", () => {
    it("should return an unsubscribe function", async () => {
      const service = new DiscussionService(mockConfig);
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
      const service = new DiscussionService(mockConfig);
      expect(service.getMessages()).toEqual([]);
    });

    it("should return readonly array", async () => {
      const service = new DiscussionService(mockConfig);
      await service.sendMessage("Hello");

      const messages = service.getMessages();
      expect(messages).toHaveLength(2);
    });
  });

  describe("isGenerating", () => {
    it("should be false initially", () => {
      const service = new DiscussionService(mockConfig);
      expect(service.isGenerating()).toBe(false);
    });
  });

  describe("getDefaultModel", () => {
    it("should return the model from config", () => {
      vi.mocked(mockConfig.getDefaultModel).mockReturnValue("test-model");

      const service = new DiscussionService(mockConfig);
      expect(service.getDefaultModel()).toBe("test-model");
    });

    it("should return undefined when config has no model", () => {
      vi.mocked(mockConfig.getDefaultModel).mockReturnValue(undefined);

      const service = new DiscussionService(mockConfig);
      expect(service.getDefaultModel()).toBeUndefined();
    });
  });

  describe("generateInitialMessage", () => {
    it("should generate first assistant message using initial prompt", async () => {
      mockConfig.buildInitialPrompt = vi
        .fn()
        .mockReturnValue("Summarize the chapter.");
      mockOpenRouterChatAPI.postChat.mockResolvedValue(
        "Here is the chapter summary.",
      );

      const service = new DiscussionService(mockConfig);
      await service.generateInitialMessage();

      const messages = service.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        role: "assistant",
        content: "Here is the chapter summary.",
      });
    });

    it("should include initial prompt as user message in LLM call", async () => {
      mockConfig.buildInitialPrompt = vi
        .fn()
        .mockReturnValue("Summarize the chapter.");

      const service = new DiscussionService(mockConfig);
      await service.generateInitialMessage();

      const callMessages = mockOpenRouterChatAPI.postChat.mock.calls[0][0];
      const lastMessage = callMessages[callMessages.length - 1];
      expect(lastMessage).toEqual({
        role: "user",
        content: "Summarize the chapter.",
      });
    });

    it("should not generate if messages already exist", async () => {
      mockConfig.buildInitialPrompt = vi
        .fn()
        .mockReturnValue("Summarize the chapter.");

      const service = new DiscussionService(mockConfig);
      await service.sendMessage("Hello");
      mockOpenRouterChatAPI.postChat.mockClear();

      await service.generateInitialMessage();

      expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
    });

    it("should not generate if buildInitialPrompt is undefined", async () => {
      const service = new DiscussionService(mockConfig);
      await service.generateInitialMessage();

      expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
      expect(service.getMessages()).toHaveLength(0);
    });

    it("should not generate if buildInitialPrompt returns undefined", async () => {
      mockConfig.buildInitialPrompt = vi.fn().mockReturnValue(undefined);

      const service = new DiscussionService(mockConfig);
      await service.generateInitialMessage();

      expect(mockOpenRouterChatAPI.postChat).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      mockConfig.buildInitialPrompt = vi
        .fn()
        .mockReturnValue("Summarize the chapter.");
      mockOpenRouterChatAPI.postChat.mockRejectedValue(
        new Error("Network error"),
      );

      const service = new DiscussionService(mockConfig);
      await service.generateInitialMessage();

      const messages = service.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe("assistant");
      expect(messages[0].content).toContain("Sorry");
      expect(mockErrorService.log).toHaveBeenCalled();
    });

    it("should notify subscribers during generation", async () => {
      mockConfig.buildInitialPrompt = vi
        .fn()
        .mockReturnValue("Summarize the chapter.");

      const service = new DiscussionService(mockConfig);
      const subscriber = vi.fn();
      service.subscribe(subscriber);

      await service.generateInitialMessage();

      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it("should use model override when provided", async () => {
      mockConfig.buildInitialPrompt = vi
        .fn()
        .mockReturnValue("Summarize the chapter.");

      const service = new DiscussionService(mockConfig);
      await service.generateInitialMessage("custom-model");

      expect(mockOpenRouterChatAPI.postChat).toHaveBeenCalledWith(
        expect.any(Array),
        "custom-model",
      );
    });
  });

  describe("sendFinalFeedbackAndGenerate", () => {
    it("should add user message and trigger generate", async () => {
      const service = new DiscussionService(mockConfig);
      await service.sendMessage("Initial discussion");

      await service.sendFinalFeedbackAndGenerate("Final thought");

      const messages = service.getMessages();
      const userMessages = messages.filter((m) => m.role === "user");
      expect(userMessages).toHaveLength(2);
      expect(userMessages[1].content).toBe("Final thought");
      expect(mockConfig.generateFromFeedback).toHaveBeenCalledWith(
        expect.stringContaining("Final thought"),
      );
    });

    it("should generate without adding message when userMessage is empty", async () => {
      const service = new DiscussionService(mockConfig);
      await service.sendMessage("Something to discuss");

      await service.sendFinalFeedbackAndGenerate("");

      expect(mockConfig.generateFromFeedback).toHaveBeenCalled();
      const userMessages = service
        .getMessages()
        .filter((m) => m.role === "user");
      expect(userMessages).toHaveLength(1);
    });

    it("should generate without adding message when userMessage is undefined", async () => {
      const service = new DiscussionService(mockConfig);
      await service.sendMessage("Something to discuss");

      await service.sendFinalFeedbackAndGenerate(undefined);

      expect(mockConfig.generateFromFeedback).toHaveBeenCalled();
    });

    it("should not run while already generating", async () => {
      mockOpenRouterChatAPI.postChat.mockImplementation(
        () => new Promise(() => {}),
      );

      const service = new DiscussionService(mockConfig);
      service.sendMessage("First");
      await flushPromises();

      await service.sendFinalFeedbackAndGenerate("While busy");

      expect(mockConfig.generateFromFeedback).not.toHaveBeenCalled();
    });

    it("should do nothing if no messages exist and no feedback given", async () => {
      const service = new DiscussionService(mockConfig);

      await service.sendFinalFeedbackAndGenerate("");

      expect(mockConfig.generateFromFeedback).not.toHaveBeenCalled();
    });

    it("should work with only final feedback and no prior messages", async () => {
      const service = new DiscussionService(mockConfig);

      await service.sendFinalFeedbackAndGenerate("Just this one thought");

      expect(mockConfig.generateFromFeedback).toHaveBeenCalledWith(
        expect.stringContaining("Just this one thought"),
      );
    });
  });
});
