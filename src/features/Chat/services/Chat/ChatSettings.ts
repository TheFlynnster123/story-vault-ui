import type {
  OpenRouterReasoningEffort,
  OpenRouterRequestSettings,
} from "../../../OpenRouter/services/OpenRouterRequestSettings";

export const DEFAULT_REASONING_RETENTION_MESSAGES = 4;

export interface ChatSettings {
  timestampCreatedUtcMs: number;
  chatTitle: string;
  backgroundPhotoBase64?: string;
  backgroundPhotoWorkflowId?: string;
  /** Legacy persisted field. Use backgroundPhotoWorkflowId for new writes. */
  backgroundPhotoCivitJobId?: string;
  prompt: string;
  customPrompt?: string;
  /** Per-chat model override. When set, overrides the system default model. */
  modelOverride?: string;
  /** Per-chat OpenRouter request settings for the model override. */
  modelRequestSettingsOverride?: OpenRouterRequestSettings;
  /** Per-chat reasoning effort for the model override. */
  modelReasoningEffortOverride?: OpenRouterReasoningEffort;
  /** Per-chat message transparency (0-1). When set, overrides the default. */
  messageTransparency?: number;
  /** Whether the chat should generate a reasoning message before assistant replies. Defaults to true. */
  reasoningEnabled?: boolean;
  /** Optional per-chat override for the system reasoning prompt. */
  reasoningPromptOverride?: string;
  /** Number of regular chat messages after which a reasoning message is disabled for LLM context. Null means never disable. */
  reasoningExpiresAfterMessages?: number | null;
  /** Whether Agent Flow should automatically analyze after user messages. */
  agentFlowAutoRunEnabled?: boolean;
  /** Number of saved user messages between automatic Agent Flow analyses. */
  agentFlowAutoRunInterval?: number;
  /** Counter for saved user messages since the last automatic analysis. */
  agentFlowMessagesSinceLastRun?: number;
  /** 0-100 value controlling how proactive Agent Flow should be. */
  agentFlowSensitivity?: number;
}
