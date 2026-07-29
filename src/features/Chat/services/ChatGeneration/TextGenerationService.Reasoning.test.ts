import { beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../../../../services/Dependencies";
import { TextGenerationService } from "./TextGenerationService";
import { createContextDocument } from "./ContextDocument";
import { DEFAULT_SYSTEM_PROMPTS } from "../../../Prompts/services/SystemPrompts";

vi.mock("../../../../services/Dependencies");

const CHAT_ID = "chat-1";

describe("TextGenerationService reasoning", () => {
  const mockContextMessages = [{ role: "user" as const, content: "Hello" }];
  const mockRequestMessages = [
    ...mockContextMessages,
    {
      id: expect.any(String),
      role: "user" as const,
      content: "Response prompt",
    },
  ];
  const mockReasoningMessages = [
    ...mockContextMessages,
    {
      id: expect.any(String),
      role: "user" as const,
      content: "Reason first",
    },
  ];
  const mockRegenerationMessages = [
    ...mockContextMessages,
    {
      id: expect.any(String),
      role: "user" as const,
      content:
        'The previous response was: "Original response"\n\nPlease regenerate with this feedback: Make it sharper',
    },
  ];
  const mockResponseTrace = {
    projection: [],
    sections: [],
    appendedSources: ["response-prompt"],
  };
  const mockReasoningTrace = {
    projection: [],
    sections: [],
    appendedSources: ["reasoning-prompt"],
  };
  const mockRegenerationTrace = {
    projection: [],
    sections: [],
    appendedSources: ["regeneration-feedback"],
  };
  const getLastPersistedTextMessage = vi.fn();
  const getMessage = vi.fn();
  const addUserMessage = vi.fn();
  const addStreamingMessage = vi.fn();
  const startStreamingExistingMessage = vi.fn();
  const updateStreamingMessage = vi.fn();
  const removeStreamingMessage = vi.fn();
  const postChatStream = vi.fn();
  const compressEligibleMessages = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getLastPersistedTextMessage.mockReturnValue(undefined);
    getMessage.mockReturnValue({
      id: "assistant-1",
      role: "assistant",
      type: "message",
      content: "Original response",
    });
    addUserMessage.mockResolvedValue(undefined);
    postChatStream.mockImplementation(
      (
        _messages,
        onToken: (content: string) => void,
        _model,
        _requestSettings,
        _requestType,
        requestLabel,
      ) => {
        const content =
          requestLabel === "Reasoning"
            ? "Reasoning output"
            : "Assistant output";
        onToken(content);
        return Promise.resolve(content);
      },
    );

    vi.mocked(d.PlanGenerationService).mockReturnValue({
      onMessageSent: vi.fn(),
    } as unknown as ReturnType<typeof d.PlanGenerationService>);

    vi.mocked(d.ChatSettingsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue({
        reasoningEnabled: true,
        reasoningConsolidateMessageHistory: false,
        prompt: "Response prompt",
      }),
    } as unknown as ReturnType<typeof d.ChatSettingsService>);

    vi.mocked(d.LLMMessageContextService).mockReturnValue({
      buildContextWithTrace: vi.fn().mockResolvedValue({
        messages: mockContextMessages,
        document: createContextDocument({
          projectedHistory: mockContextMessages,
          memoryMessages: [],
          characterSheetMessages: [],
          recentMessageCount: 0,
        }),
        trace: {
          projection: [],
          sections: [],
        },
      }),
    } as unknown as ReturnType<typeof d.LLMMessageContextService>);

    vi.mocked(d.SystemPromptsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        reasoningPrompt: "Reason first",
      }),
    } as unknown as ReturnType<typeof d.SystemPromptsService>);

    vi.mocked(d.UserChatProjection).mockReturnValue({
      GetLastPersistedTextMessage: getLastPersistedTextMessage,
      addStreamingMessage,
      startStreamingExistingMessage,
      updateStreamingMessage,
      removeStreamingMessage,
    } as unknown as ReturnType<typeof d.UserChatProjection>);

    vi.mocked(d.LLMChatProjection).mockReturnValue({
      GetMessage: getMessage,
    } as unknown as ReturnType<typeof d.LLMChatProjection>);

    vi.mocked(d.OpenRouterChatAPI).mockReturnValue({
      postChat: vi.fn(),
      postChatStream,
    } as unknown as ReturnType<typeof d.OpenRouterChatAPI>);

    vi.mocked(d.ChatService).mockReturnValue({
      AddUserMessage: addUserMessage,
      AddReasoningMessage: vi.fn().mockResolvedValue(undefined),
      AddAssistantResponse: vi.fn().mockResolvedValue(undefined),
      EditMessage: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof d.ChatService>);

    vi.mocked(d.CharacterMaintenanceService).mockReturnValue({
      maybeCreateProposalAfterSavedUserTurn: vi.fn().mockResolvedValue({
        status: "not-due",
      }),
    } as unknown as ReturnType<typeof d.CharacterMaintenanceService>);
    vi.mocked(d.ContinuityHistoryMaintenanceService).mockReturnValue({
      onSavedUserTurn: vi.fn().mockResolvedValue({
        status: "waiting",
        updatedCount: 0,
        discoveredCount: 0,
      }),
    } as unknown as ReturnType<typeof d.ContinuityHistoryMaintenanceService>);

    vi.mocked(d.AgentFlowService).mockReturnValue({
      analyzeAutomaticSuggestion: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof d.AgentFlowService>);

    vi.mocked(d.MessageCompressionService).mockReturnValue({
      compressEligibleMessages,
    } as unknown as ReturnType<typeof d.MessageCompressionService>);

    vi.mocked(d.ErrorService).mockReturnValue({
      log: vi.fn(),
    } as unknown as ReturnType<typeof d.ErrorService>);
  });

  it("generates and saves reasoning before the assistant response when enabled", async () => {
    const service = new TextGenerationService(CHAT_ID);

    await service.generateResponse();

    expect(
      d.LLMMessageContextService(CHAT_ID).buildContextWithTrace,
    ).toHaveBeenCalled();
    expect(postChatStream).toHaveBeenNthCalledWith(
      1,
      mockReasoningMessages,
      expect.any(Function),
      undefined,
      undefined,
      "chat",
      "Reasoning",
      mockReasoningTrace,
    );
    expect(addStreamingMessage).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      "reasoning",
    );
    expect(updateStreamingMessage).toHaveBeenCalledWith("Reasoning output");
    expect(d.ChatService(CHAT_ID).AddReasoningMessage).toHaveBeenCalledWith(
      "Reasoning output",
    );
    expect(removeStreamingMessage).toHaveBeenCalledTimes(2);
    expect(postChatStream).toHaveBeenCalledTimes(2);
    expect(compressEligibleMessages).toHaveBeenCalledOnce();
  });

  it("uses reasoning model override for reasoning and chat model override for response", async () => {
    vi.mocked(d.ChatSettingsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue({
        reasoningEnabled: true,
        reasoningConsolidateMessageHistory: false,
        prompt: "Response prompt",
        modelOverride: "openai/gpt-4.1",
        modelRequestSettingsOverride: { temperature: 0.4 },
        reasoningModelOverride: "anthropic/claude-4-sonnet",
        reasoningModelRequestSettingsOverride: {
          reasoning: { effort: "high" },
        },
      }),
    } as unknown as ReturnType<typeof d.ChatSettingsService>);
    const service = new TextGenerationService(CHAT_ID);

    await service.generateResponse();

    expect(postChatStream).toHaveBeenNthCalledWith(
      1,
      mockReasoningMessages,
      expect.any(Function),
      "anthropic/claude-4-sonnet",
      { reasoning: { effort: "high" } },
      "chat",
      "Reasoning",
      mockReasoningTrace,
    );
    expect(postChatStream).toHaveBeenNthCalledWith(
      2,
      mockRequestMessages,
      expect.any(Function),
      "openai/gpt-4.1",
      { temperature: 0.4 },
      "chat",
      "Chat",
      mockResponseTrace,
    );
  });

  it("ends the response request with a user task after persisted reasoning", async () => {
    const contextAfterReasoning = [
      { role: "system" as const, content: "Story context" },
      { role: "user" as const, content: "Continue the story" },
      { role: "assistant" as const, content: "Reasoning output" },
    ];
    vi.mocked(
      d.LLMMessageContextService(CHAT_ID).buildContextWithTrace,
    ).mockResolvedValueOnce({
      messages: mockContextMessages,
      document: createContextDocument({
        projectedHistory: mockContextMessages,
        memoryMessages: [],
        characterSheetMessages: [],
        recentMessageCount: 0,
      }),
      trace: {
        projection: [],
        sections: [],
      },
    }).mockResolvedValueOnce({
      messages: contextAfterReasoning,
      document: createContextDocument({
        projectedHistory: contextAfterReasoning,
        memoryMessages: [],
        characterSheetMessages: [],
        recentMessageCount: 0,
      }),
      trace: {
        projection: [],
        sections: [],
      },
    });
    const service = new TextGenerationService(CHAT_ID);

    await service.generateResponse();

    const responseMessages = postChatStream.mock.calls[1][0];
    expect(responseMessages.slice(-2)).toEqual([
      {
        role: "assistant",
        content: "Reasoning output",
      },
      {
        id: expect.any(String),
        role: "user",
        content: "Response prompt",
      },
    ]);
  });

  it("skips the reasoning request when reasoning is disabled", async () => {
    vi.mocked(d.ChatSettingsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue({ reasoningEnabled: false }),
    } as unknown as ReturnType<typeof d.ChatSettingsService>);
    const service = new TextGenerationService(CHAT_ID);

    await service.generateResponse();

    expect(
      d.LLMMessageContextService(CHAT_ID).buildContextWithTrace,
    ).toHaveBeenCalledOnce();
    expect(d.OpenRouterChatAPI().postChat).not.toHaveBeenCalled();
    expect(d.ChatService(CHAT_ID).AddReasoningMessage).not.toHaveBeenCalled();
    expect(postChatStream).toHaveBeenCalledOnce();
  });

  it("skips reasoning for an empty continuation after a reasoning message", async () => {
    getLastPersistedTextMessage.mockReturnValue({
      id: "reasoning-1",
      type: "reasoning",
    });
    const service = new TextGenerationService(CHAT_ID);

    await service.generateResponse();

    expect(
      d.LLMMessageContextService(CHAT_ID).buildContextWithTrace,
    ).toHaveBeenCalledOnce();
    expect(d.OpenRouterChatAPI().postChat).not.toHaveBeenCalled();
    expect(d.ChatService(CHAT_ID).AddReasoningMessage).not.toHaveBeenCalled();
    expect(postChatStream).toHaveBeenCalledOnce();
  });

  it("captures the prior message before saving new user input", async () => {
    getLastPersistedTextMessage.mockReturnValue({
      id: "reasoning-1",
      type: "reasoning",
    });
    const service = new TextGenerationService(CHAT_ID);

    await service.generateResponse("Continue the story");

    expect(getLastPersistedTextMessage).toHaveBeenCalledOnce();
    expect(addUserMessage).toHaveBeenCalledWith("Continue the story");
    expect(getLastPersistedTextMessage.mock.invocationCallOrder[0]).toBeLessThan(
      addUserMessage.mock.invocationCallOrder[0],
    );
    expect(d.OpenRouterChatAPI().postChat).not.toHaveBeenCalled();
  });

  it("removes partial reasoning without saving when the stream fails", async () => {
    postChatStream.mockRejectedValueOnce(new Error("Stream failed"));
    const service = new TextGenerationService(CHAT_ID);

    await expect(service.generateResponse()).rejects.toThrow("Stream failed");

    expect(addStreamingMessage).toHaveBeenCalledWith(
      expect.any(String),
      "reasoning",
    );
    expect(removeStreamingMessage).toHaveBeenCalledOnce();
    expect(d.ChatService(CHAT_ID).AddReasoningMessage).not.toHaveBeenCalled();
  });

  it("passes regeneration context and its trace to request tracking", async () => {
    const service = new TextGenerationService(CHAT_ID);

    await service.regenerateResponse("assistant-1", "Make it sharper");

    expect(
      d.LLMMessageContextService(CHAT_ID).buildContextWithTrace,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        history: true,
        memories: true,
        characterSheets: true,
        continuityHistories: true,
        plans: true,
      }),
      { beforeMessageId: "assistant-1" },
    );
    expect(startStreamingExistingMessage).toHaveBeenCalledWith("assistant-1");
    expect(postChatStream).toHaveBeenCalledWith(
      mockRegenerationMessages,
      expect.any(Function),
      undefined,
      undefined,
      "chat",
      "Chat",
      mockRegenerationTrace,
    );
    expect(d.ChatService(CHAT_ID).EditMessage).toHaveBeenCalledWith(
      "assistant-1",
      "Assistant output",
    );
  });

  it("runs post-user-message tasks after saving non-empty input", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const analyzeAutomaticSuggestion = vi.fn().mockResolvedValue(undefined);
    vi.mocked(d.ChatSettingsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue({
        reasoningEnabled: true,
        agentFlowAutoRunEnabled: true,
        agentFlowAutoRunInterval: 1,
        agentFlowMessagesSinceLastRun: 0,
      }),
      update,
    } as unknown as ReturnType<typeof d.ChatSettingsService>);
    vi.mocked(d.AgentFlowService).mockReturnValue({
      analyzeAutomaticSuggestion,
    } as unknown as ReturnType<typeof d.AgentFlowService>);
    const service = new TextGenerationService(CHAT_ID);

    await service.generateResponse("Continue");

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith({
        agentFlowMessagesSinceLastRun: 0,
      });
      expect(analyzeAutomaticSuggestion).toHaveBeenCalledOnce();
    });
    expect(
      d.CharacterMaintenanceService(CHAT_ID)
        .maybeCreateProposalAfterSavedUserTurn,
    ).toHaveBeenCalledOnce();
  });
});
