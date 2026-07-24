import { beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../../../../services/Dependencies";
import { TextGenerationService } from "./TextGenerationService";

vi.mock("../../../../services/Dependencies");

const CHAT_ID = "chat-1";

describe("TextGenerationService reasoning", () => {
  const mockRequestMessages = [{ role: "user" as const, content: "Hello" }];
  const mockReasoningMessages = [
    { role: "system" as const, content: "Reason first" },
  ];
  const getLastPersistedTextMessage = vi.fn();
  const addUserMessage = vi.fn();
  const addStreamingMessage = vi.fn();
  const updateStreamingMessage = vi.fn();
  const removeStreamingMessage = vi.fn();
  const postChatStream = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getLastPersistedTextMessage.mockReturnValue(undefined);
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
      Get: vi.fn().mockResolvedValue({ reasoningEnabled: true }),
    } as unknown as ReturnType<typeof d.ChatSettingsService>);

    vi.mocked(d.LLMMessageContextService).mockReturnValue({
      buildReasoningRequestMessages: vi
        .fn()
        .mockResolvedValue(mockReasoningMessages),
      buildGenerationRequestMessages: vi
        .fn()
        .mockResolvedValue(mockRequestMessages),
    } as unknown as ReturnType<typeof d.LLMMessageContextService>);

    vi.mocked(d.UserChatProjection).mockReturnValue({
      GetLastPersistedTextMessage: getLastPersistedTextMessage,
      addStreamingMessage,
      updateStreamingMessage,
      removeStreamingMessage,
    } as unknown as ReturnType<typeof d.UserChatProjection>);

    vi.mocked(d.OpenRouterChatAPI).mockReturnValue({
      postChat: vi.fn(),
      postChatStream,
    } as unknown as ReturnType<typeof d.OpenRouterChatAPI>);

    vi.mocked(d.ChatService).mockReturnValue({
      AddUserMessage: addUserMessage,
      AddReasoningMessage: vi.fn().mockResolvedValue(undefined),
      AddAssistantMessage: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof d.ChatService>);

    vi.mocked(d.CharacterMaintenanceService).mockReturnValue({
      maybeCreateProposalAfterSavedUserTurn: vi.fn().mockResolvedValue({
        status: "not-due",
      }),
    } as unknown as ReturnType<typeof d.CharacterMaintenanceService>);

    vi.mocked(d.AgentFlowService).mockReturnValue({
      analyzeAutomaticSuggestion: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof d.AgentFlowService>);

    vi.mocked(d.ErrorService).mockReturnValue({
      log: vi.fn(),
    } as unknown as ReturnType<typeof d.ErrorService>);
  });

  it("generates and saves reasoning before the assistant response when enabled", async () => {
    const service = new TextGenerationService(CHAT_ID);

    await service.generateResponse();

    expect(
      d.LLMMessageContextService(CHAT_ID).buildReasoningRequestMessages,
    ).toHaveBeenCalled();
    expect(postChatStream).toHaveBeenNthCalledWith(
      1,
      mockReasoningMessages,
      expect.any(Function),
      undefined,
      undefined,
      "chat",
      "Reasoning",
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
  });

  it("uses reasoning model override for reasoning and chat model override for response", async () => {
    vi.mocked(d.ChatSettingsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue({
        reasoningEnabled: true,
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
    );
    expect(postChatStream).toHaveBeenNthCalledWith(
      2,
      mockRequestMessages,
      expect.any(Function),
      "openai/gpt-4.1",
      { temperature: 0.4 },
    );
  });

  it("skips the reasoning request when reasoning is disabled", async () => {
    vi.mocked(d.ChatSettingsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue({ reasoningEnabled: false }),
    } as unknown as ReturnType<typeof d.ChatSettingsService>);
    const service = new TextGenerationService(CHAT_ID);

    await service.generateResponse();

    expect(
      d.LLMMessageContextService(CHAT_ID).buildReasoningRequestMessages,
    ).not.toHaveBeenCalled();
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
      d.LLMMessageContextService(CHAT_ID).buildReasoningRequestMessages,
    ).not.toHaveBeenCalled();
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
