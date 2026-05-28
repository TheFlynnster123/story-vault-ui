import type { LLMMessage } from "../../../../services/CQRS/LLMChatProjection";
import { d } from "../../../../services/Dependencies";
import { toSystemMessage, toUserMessage } from "../../../../services/Utils/MessageUtils";
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

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  async generateIntentSuggestion(): Promise<AgentFlowSuggestion> {
    const systemPrompts = await d.SystemPromptsService().Get();
    const prompt =
      systemPrompts?.agentIntentPrompt?.trim() ||
      DEFAULT_SYSTEM_PROMPTS.agentIntentPrompt;
    const model =
      systemPrompts?.agentIntentModel ||
      DEFAULT_SYSTEM_PROMPTS.agentIntentModel;

    const contextMessages = await d
      .LLMMessageContextService(this.chatId)
      .buildGenerationRequestMessages(false);

    const messages = buildIntentMessages(contextMessages, prompt);
    const response = await d.OpenRouterChatAPI().postStructuredChat<unknown>(
      messages,
      AGENT_INTENT_RESPONSE_FORMAT,
      model,
      "Agent Intent",
      true,
    );

    return normalizeSuggestion(response);
  }
}

const buildIntentMessages = (
  contextMessages: LLMMessage[],
  prompt: string,
): LLMMessage[] => [
  ...contextMessages,
  toSystemMessage(prompt),
  toUserMessage(
    [
      "Analyze the current chat state and return exactly one JSON object.",
      "Do not return a bare intent string.",
      "Use this shape:",
      `{"intent":"continue_chat","confidence":0.25,"rationale":"No workflow action is useful yet.","proposedActions":[]}`,
    ].join("\n"),
  ),
];

const normalizeSuggestion = (
  suggestion: unknown,
): AgentFlowSuggestion => {
  if (typeof suggestion === "string") {
    const intent = suggestion.trim();
    return {
      intent: isAgentIntent(intent) ? intent : "continue_chat",
      confidence: isAgentIntent(intent) ? 0.35 : 0,
      rationale: isAgentIntent(intent)
        ? "The model returned only an intent. Run analysis again for detailed actions."
        : "The model did not return a usable agent flow suggestion.",
      proposedActions: [],
    };
  }

  if (!suggestion || typeof suggestion !== "object") {
    return {
      intent: "continue_chat",
      confidence: 0,
      rationale: "The model did not return a usable agent flow suggestion.",
      proposedActions: [],
    };
  }

  const parsed = suggestion as Partial<AgentFlowSuggestion>;

  return {
    intent: isAgentIntent(parsed.intent) ? parsed.intent : "continue_chat",
    confidence: clampConfidence(parsed.confidence),
    rationale: String(parsed.rationale ?? ""),
    proposedActions: Array.isArray(parsed.proposedActions)
      ? parsed.proposedActions.filter(isAgentFlowAction).slice(0, 3)
      : [],
  };
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
