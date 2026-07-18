import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentFlowService } from "./AgentFlowService";
import { d } from "../../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../../../Prompts/services/SystemPrompts";

vi.mock("../../../../services/Dependencies");

describe("AgentFlowService", () => {
  const chatId = "chat-1";
  const buildGenerationRequestMessages = vi.fn();
  const postStructuredChat = vi.fn();
  const getAgentFlowState = vi.fn();
  const saveAgentFlowState = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    buildGenerationRequestMessages.mockResolvedValue([
      { id: "msg-1", role: "user", content: "Remember she hates roses." },
    ]);

    postStructuredChat.mockResolvedValue({
      intent: "update_memory",
      confidence: 0.82,
      rationale: "A durable character preference was introduced.",
      proposedActions: [
        {
          tool: "save_memory",
          title: "Save preference",
          reason: "This is useful continuity.",
          args: { content: "She hates roses." },
          requiresConfirmation: true,
        },
      ],
    });
    getAgentFlowState.mockResolvedValue(undefined);
    saveAgentFlowState.mockResolvedValue(undefined);

    vi.mocked(d.LLMMessageContextService).mockReturnValue({
      buildGenerationRequestMessages,
    } as unknown as ReturnType<typeof d.LLMMessageContextService>);
    vi.mocked(d.OpenRouterChatAPI).mockReturnValue({
      postStructuredChat,
    } as unknown as ReturnType<typeof d.OpenRouterChatAPI>);
    vi.mocked(d.SystemPromptsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof d.SystemPromptsService>);
    vi.mocked(d.ChatSettingsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof d.ChatSettingsService>);
    vi.mocked(d.AgentFlowStateManagedBlob).mockReturnValue({
      get: getAgentFlowState,
      save: saveAgentFlowState,
    } as unknown as ReturnType<typeof d.AgentFlowStateManagedBlob>);
  });

  it("persists generated suggestions for async review", async () => {
    const service = new AgentFlowService(chatId);

    const suggestion = await service.analyzeIntentSuggestion();

    expect(saveAgentFlowState).toHaveBeenCalledWith({
      pendingSuggestion: suggestion,
    });
    expect(service.CurrentSuggestion).toBe(suggestion);
  });

  it("restores a pending suggestion after refresh", async () => {
    const pendingSuggestion = {
      intent: "update_memory" as const,
      confidence: 0.82,
      rationale: "A durable preference was introduced.",
      proposedActions: [
        {
          tool: "save_memory" as const,
          title: "Save preference",
          reason: "Keep this for continuity.",
          args: { content: "She hates roses." },
          requiresConfirmation: true,
        },
      ],
    };
    getAgentFlowState.mockResolvedValue({ pendingSuggestion });
    const service = new AgentFlowService(chatId);

    await service.initialize();

    expect(service.CurrentSuggestion).toEqual(pendingSuggestion);
  });

  it("keeps an unresolved suggestion during automatic analysis", async () => {
    const pendingSuggestion = {
      intent: "update_memory" as const,
      confidence: 0.82,
      rationale: "A durable preference was introduced.",
      proposedActions: [
        {
          tool: "save_memory" as const,
          title: "Save preference",
          reason: "Keep this for continuity.",
          args: { content: "She hates roses." },
          requiresConfirmation: true,
        },
      ],
    };
    getAgentFlowState.mockResolvedValue({ pendingSuggestion });
    const service = new AgentFlowService(chatId);

    const result = await service.analyzeAutomaticSuggestion();

    expect(result).toEqual(pendingSuggestion);
    expect(postStructuredChat).not.toHaveBeenCalled();
    expect(saveAgentFlowState).not.toHaveBeenCalled();
  });

  it("removes a completed action from pending review", async () => {
    const pendingSuggestion = {
      intent: "update_memory" as const,
      confidence: 0.82,
      rationale: "Two durable preferences were introduced.",
      proposedActions: [
        {
          tool: "save_memory" as const,
          title: "Save flower preference",
          reason: "Keep this for continuity.",
          args: { content: "She hates roses." },
          requiresConfirmation: true,
        },
        {
          tool: "save_memory" as const,
          title: "Save drink preference",
          reason: "Keep this for continuity.",
          args: { content: "She loves tea." },
          requiresConfirmation: true,
        },
      ],
    };
    getAgentFlowState.mockResolvedValue({ pendingSuggestion });
    const service = new AgentFlowService(chatId);

    await service.resolveAction(0);

    expect(service.CurrentSuggestion?.proposedActions).toEqual([
      pendingSuggestion.proposedActions[1],
    ]);
    expect(saveAgentFlowState).toHaveBeenCalledWith({
      pendingSuggestion: {
        ...pendingSuggestion,
        proposedActions: [pendingSuggestion.proposedActions[1]],
      },
    });
  });

  it("clears explicitly dismissed suggestions", async () => {
    getAgentFlowState.mockResolvedValue({
      pendingSuggestion: {
        intent: "generate_image",
        confidence: 0.7,
        rationale: "The scene is visually distinct.",
        proposedActions: [
          {
            tool: "generate_image",
            title: "Generate image",
            reason: "Capture the scene.",
            args: {},
            requiresConfirmation: true,
          },
        ],
      },
    });
    const service = new AgentFlowService(chatId);

    await service.dismissSuggestion();

    expect(service.CurrentSuggestion).toBeNull();
    expect(saveAgentFlowState).toHaveBeenCalledWith({
      pendingSuggestion: undefined,
    });
  });

  it("uses the default Grok 4.3 intent model", async () => {
    const service = new AgentFlowService(chatId);

    await service.generateIntentSuggestion();

    expect(postStructuredChat).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        type: "json_schema",
        json_schema: expect.objectContaining({
          name: "agent_flow_suggestion",
          strict: true,
        }),
      }),
      "x-ai/grok-4.3",
      "Agent Intent",
      true,
      undefined,
    );
  });

  it("uses configured prompt and model overrides", async () => {
    vi.mocked(d.SystemPromptsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue({
        ...DEFAULT_SYSTEM_PROMPTS,
        agentIntentPrompt: "Custom intent prompt",
        agentIntentModel: "openai/gpt-4.1",
      }),
    } as unknown as ReturnType<typeof d.SystemPromptsService>);

    const service = new AgentFlowService(chatId);
    await service.generateIntentSuggestion();

    const sentMessages = postStructuredChat.mock.calls[0][0];
    expect(sentMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "system",
          content: "Custom intent prompt",
        }),
      ]),
    );
    expect(postStructuredChat.mock.calls[0][2]).toBe("openai/gpt-4.1");
  });

  it("passes a manually selected intent into the request prompt", async () => {
    const service = new AgentFlowService(chatId);
    await service.generateIntentSuggestion("generate_image");

    const sentMessages = postStructuredChat.mock.calls[0][0];
    expect(sentMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: expect.stringContaining(
            'The user manually selected intent "generate_image"',
          ),
        }),
      ]),
    );
  });

  it("passes configured sensitivity into the request prompt", async () => {
    vi.mocked(d.ChatSettingsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue({ agentFlowSensitivity: 85 }),
    } as unknown as ReturnType<typeof d.ChatSettingsService>);

    const service = new AgentFlowService(chatId);
    await service.generateIntentSuggestion();

    const sentMessages = postStructuredChat.mock.calls[0][0];
    expect(sentMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: expect.stringContaining(
            "Agent flow sensitivity: 85/100 (Proactive)",
          ),
        }),
      ]),
    );
  });

  it("normalizes malformed confidence and invalid actions", async () => {
    postStructuredChat.mockResolvedValue({
      intent: "not-real",
      confidence: 42,
      rationale: "Bad response",
      proposedActions: [
        { tool: "save_memory", title: "Missing fields" },
        {
          tool: "generate_image",
          title: "Generate image",
          reason: "Visual scene",
          args: {},
          requiresConfirmation: true,
        },
      ],
    });

    const service = new AgentFlowService(chatId);
    const suggestion = await service.generateIntentSuggestion();

    expect(suggestion.intent).toBe("continue_chat");
    expect(suggestion.confidence).toBe(1);
    expect(suggestion.proposedActions).toHaveLength(1);
    expect(suggestion.proposedActions[0].tool).toBe("generate_image");
  });

  it("falls back cleanly when the model returns only an intent string", async () => {
    postStructuredChat.mockResolvedValue("update_memory");

    const service = new AgentFlowService(chatId);
    const suggestion = await service.generateIntentSuggestion();

    expect(suggestion).toEqual({
      intent: "update_memory",
      confidence: 0.35,
      rationale:
        "The model returned only an intent. Run analysis again for detailed actions.",
      proposedActions: [
        {
          tool: "save_memory",
          title: "Open memories",
          reason:
            "The model returned only an intent. Run analysis again for detailed actions.",
          args: {},
          requiresConfirmation: true,
        },
      ],
    });
  });

  it("creates an executable ask_user action when none is returned", async () => {
    postStructuredChat.mockResolvedValue({
      intent: "ask_user",
      confidence: 0.6,
      rationale: "Should the scene move to the alley or stay inside?",
      proposedActions: [],
    });

    const service = new AgentFlowService(chatId);
    const suggestion = await service.generateIntentSuggestion("ask_user");

    expect(suggestion.proposedActions).toEqual([
      {
        tool: "ask_user",
        title: "Ask user",
        reason: "Should the scene move to the alley or stay inside?",
        args: {
          question: "Should the scene move to the alley or stay inside?",
        },
        requiresConfirmation: true,
      },
    ]);
  });
});
