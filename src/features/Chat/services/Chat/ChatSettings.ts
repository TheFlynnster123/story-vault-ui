import type {
  OpenRouterReasoningEffort,
  OpenRouterRequestSettings,
} from "../../../OpenRouter/services/OpenRouterRequestSettings";

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
  /** Whether Agent Flow should automatically analyze after user messages. */
  agentFlowAutoRunEnabled?: boolean;
  /** Number of saved user messages between automatic Agent Flow analyses. */
  agentFlowAutoRunInterval?: number;
  /** Counter for saved user messages since the last automatic analysis. */
  agentFlowMessagesSinceLastRun?: number;
}
