import type { LLMMessage } from "../../../../services/CQRS/LLMChatProjection";
import { d } from "../../../../services/Dependencies";
import {
  toSystemMessage,
  toUserMessage,
} from "../../../../services/Utils/MessageUtils";
import { DEFAULT_SYSTEM_PROMPTS } from "../../../Prompts/services/SystemPrompts";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";

export const getAgentFlowServiceInstance = createInstanceCache(
  (chatId: string) => new AgentFlowService(chatId),
);

export type AgentIntent =
  | "continue_chat"
  | "update_memory"
  | "generate_image"
  | "refresh_plan"
  | "create_chapter"
  | "add_note"
  | "ask_user";

export type AgentToolName =
  | "save_memory"
  | "generate_image"
  | "refresh_plan"
  | "create_chapter"
  | "add_note"
  | "ask_user";

export interface AgentFlowAction {
  tool: AgentToolName;
  title: string;
  reason: string;
  args: Record<string, unknown>;
  requiresConfirmation: boolean;
}

export interface AgentFlowSuggestion {
  intent: AgentIntent;
  confidence: number;
  rationale: string;
  proposedActions: AgentFlowAction[];
}

const AGENT_INTENT_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "agent_flow_suggestion",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["intent", "confidence", "rationale", "proposedActions"],
      properties: {
        intent: {
          type: "string",
          enum: [
            "continue_chat",
            "update_memory",
            "generate_image",
            "refresh_plan",
            "create_chapter",
            "add_note",
            "ask_user",
          ],
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        rationale: { type: "string" },
        proposedActions: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "tool",
              "title",
              "reason",
              "args",
              "requiresConfirmation",
            ],
            properties: {
              tool: {
                type: "string",
                enum: [
                  "save_memory",
                  "generate_image",
                  "refresh_plan",
                  "create_chapter",
                  "add_note",
                  "ask_user",
                ],
              },
              title: { type: "string" },
              reason: { type: "string" },
              args: { type: "object" },
              requiresConfirmation: { type: "boolean" },
            },
          },
        },
      },
    },
  },
};

export class AgentFlowService {
  private readonly chatId: string;
  private subscribers = new Set<() => void>();

  public CurrentSuggestion: AgentFlowSuggestion | null = null;
  public IsLoading: boolean = false;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  async analyzeIntentSuggestion(
    selectedIntent?: AgentIntent,
  ): Promise<AgentFlowSuggestion> {
    this.setIsLoading(true);
    try {
      const suggestion = await this.generateIntentSuggestion(selectedIntent);
      this.CurrentSuggestion = suggestion;
      this.notifySubscribers();
      return suggestion;
    } finally {
      this.setIsLoading(false);
    }
  }

  async generateIntentSuggestion(
    selectedIntent?: AgentIntent,
  ): Promise<AgentFlowSuggestion> {
    const systemPrompts = await d.SystemPromptsService().Get();
    const prompt =
      systemPrompts?.agentIntentPrompt?.trim() ||
      DEFAULT_SYSTEM_PROMPTS.agentIntentPrompt;
    const model =
      systemPrompts?.agentIntentModel ||
      DEFAULT_SYSTEM_PROMPTS.agentIntentModel;
    const requestSettings = systemPrompts?.agentIntentRequestSettings;
    const chatSettings = await d.ChatSettingsService(this.chatId).Get();
    const sensitivity = chatSettings?.agentFlowSensitivity ?? 50;

    const contextMessages = await d
      .LLMMessageContextService(this.chatId)
      .buildGenerationRequestMessages(false);

    const messages = buildIntentMessages(
      contextMessages,
      prompt,
      selectedIntent,
      sensitivity,
    );
    const response = await d
      .OpenRouterChatAPI()
      .postStructuredChat<unknown>(
        messages,
        AGENT_INTENT_RESPONSE_FORMAT,
        model,
        "Agent Intent",
        true,
        requestSettings,
      );

    return normalizeSuggestion(response, selectedIntent);
  }

  private setIsLoading(isLoading: boolean): void {
    this.IsLoading = isLoading;
    this.notifySubscribers();
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }
}

const buildIntentMessages = (
  contextMessages: LLMMessage[],
  prompt: string,
  selectedIntent?: AgentIntent,
  sensitivity: number = 50,
): LLMMessage[] => [
  ...contextMessages,
  toSystemMessage(prompt),
  toUserMessage(
    [
      "Analyze the current chat state and return exactly one JSON object.",
      formatSensitivityInstruction(sensitivity),
      selectedIntent
        ? `The user manually selected intent "${selectedIntent}". Prefer that intent and generate useful proposedActions for it when the chat context supports it. If required details are missing, use ask_user.`
        : "Select the most useful intent yourself.",
      "Do not return a bare intent string.",
      "Use this shape:",
      `{"intent":"continue_chat","confidence":0.25,"rationale":"No workflow action is useful yet.","proposedActions":[]}`,
    ].join("\n"),
  ),
];

const formatSensitivityInstruction = (sensitivity: number): string => {
  const normalized = Math.min(100, Math.max(0, Math.round(sensitivity)));

  if (normalized <= 33) {
    return `Agent flow sensitivity: ${normalized}/100 (Conservative). Only suggest workflow actions when the benefit is strong and obvious. Prefer continue_chat when uncertain.`;
  }

  if (normalized <= 66) {
    return `Agent flow sensitivity: ${normalized}/100 (Balanced). Suggest workflow actions when they are likely useful, but avoid noisy or speculative actions.`;
  }

  return `Agent flow sensitivity: ${normalized}/100 (Proactive). Prefer a useful workflow action when there is plausible benefit. Use ask_user when details are missing instead of defaulting to continue_chat.`;
};

const normalizeSuggestion = (
  suggestion: unknown,
  selectedIntent?: AgentIntent,
): AgentFlowSuggestion => {
  if (typeof suggestion === "string") {
    const intent = suggestion.trim();
    return ensureExecutableSuggestion(
      {
        intent: isAgentIntent(intent) ? intent : "continue_chat",
        confidence: isAgentIntent(intent) ? 0.35 : 0,
        rationale: isAgentIntent(intent)
          ? "The model returned only an intent. Run analysis again for detailed actions."
          : "The model did not return a usable agent flow suggestion.",
        proposedActions: [],
      },
      selectedIntent,
    );
  }

  if (!suggestion || typeof suggestion !== "object") {
    return ensureExecutableSuggestion(
      {
        intent: "continue_chat",
        confidence: 0,
        rationale: "The model did not return a usable agent flow suggestion.",
        proposedActions: [],
      },
      selectedIntent,
    );
  }

  const parsed = suggestion as Partial<AgentFlowSuggestion>;

  return ensureExecutableSuggestion(
    {
      intent: isAgentIntent(parsed.intent) ? parsed.intent : "continue_chat",
      confidence: clampConfidence(parsed.confidence),
      rationale: String(parsed.rationale ?? ""),
      proposedActions: Array.isArray(parsed.proposedActions)
        ? parsed.proposedActions.filter(isAgentFlowAction).slice(0, 3)
        : [],
    },
    selectedIntent,
  );
};

const ensureExecutableSuggestion = (
  suggestion: AgentFlowSuggestion,
  selectedIntent?: AgentIntent,
): AgentFlowSuggestion => {
  const intent = selectedIntent ?? suggestion.intent;
  if (suggestion.proposedActions.length > 0) {
    return suggestion;
  }

  const action = createFallbackAction(intent, suggestion.rationale);
  if (!action) return suggestion;

  return {
    ...suggestion,
    intent,
    proposedActions: [action],
  };
};

const createFallbackAction = (
  intent: AgentIntent,
  rationale: string,
): AgentFlowAction | null => {
  const reason = rationale.trim() || fallbackReason(intent);

  switch (intent) {
    case "update_memory":
      return {
        tool: "save_memory",
        title: "Open memories",
        reason,
        args: {},
        requiresConfirmation: true,
      };
    case "generate_image":
      return {
        tool: "generate_image",
        title: "Generate image",
        reason,
        args: {},
        requiresConfirmation: true,
      };
    case "refresh_plan":
      return {
        tool: "refresh_plan",
        title: "Open plans",
        reason,
        args: {},
        requiresConfirmation: true,
      };
    case "create_chapter":
      return {
        tool: "create_chapter",
        title: "Create chapter",
        reason,
        args: {},
        requiresConfirmation: true,
      };
    case "add_note":
      return {
        tool: "add_note",
        title: "Add note",
        reason,
        args: {},
        requiresConfirmation: true,
      };
    case "ask_user":
      return {
        tool: "ask_user",
        title: "Ask user",
        reason,
        args: { question: reason },
        requiresConfirmation: true,
      };
    case "continue_chat":
      return null;
  }
};

const fallbackReason = (intent: AgentIntent): string => {
  switch (intent) {
    case "update_memory":
      return "Review or add durable memory for this chat.";
    case "generate_image":
      return "Start image generation for the current chat moment.";
    case "refresh_plan":
      return "Review plans and refresh the relevant one.";
    case "create_chapter":
      return "Create a chapter from the current chat context.";
    case "add_note":
      return "Add short-lived guidance for upcoming turns.";
    case "ask_user":
      return "What should be clarified before taking the next workflow action?";
    case "continue_chat":
      return "No workflow action is needed.";
  }
};

const clampConfidence = (value: unknown): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
};

const isAgentIntent = (value: unknown): value is AgentIntent =>
  typeof value === "string" &&
  [
    "continue_chat",
    "update_memory",
    "generate_image",
    "refresh_plan",
    "create_chapter",
    "add_note",
    "ask_user",
  ].includes(value);

const isAgentToolName = (value: unknown): value is AgentToolName =>
  typeof value === "string" &&
  [
    "save_memory",
    "generate_image",
    "refresh_plan",
    "create_chapter",
    "add_note",
    "ask_user",
  ].includes(value);

const isAgentFlowAction = (value: unknown): value is AgentFlowAction => {
  if (!value || typeof value !== "object") return false;
  const action = value as AgentFlowAction;
  return (
    isAgentToolName(action.tool) &&
    typeof action.title === "string" &&
    typeof action.reason === "string" &&
    action.args !== null &&
    typeof action.args === "object" &&
    typeof action.requiresConfirmation === "boolean"
  );
};
