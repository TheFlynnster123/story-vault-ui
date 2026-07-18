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
  /** Per-chat model override for reasoning generation. */
  reasoningModelOverride?: string;
  /** Per-chat OpenRouter request settings paired with the reasoning model override. */
  reasoningModelRequestSettingsOverride?: OpenRouterRequestSettings;
  /** Whether to consolidate reasoning context into a single message. Defaults to true. */
  reasoningConsolidateMessageHistory?: boolean;
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
  /** Character record schema version. Missing values are legacy version 1. */
  charactersSchemaVersion?: number;
  /** Whether automatic primary-character sheet generation is enabled. */
  characterSheetsAutoGenerateEnabled?: boolean;
  /** Number of user messages between automatic character-sheet checks. */
  characterSheetsCheckInterval?: number;
  /** Saved user-message count since the prior automatic character-sheet check. */
  characterSheetsMessagesSinceLastCheck?: number;
  /** Number of recent projected messages kept after durable character context. */
  characterSheetsTrailingMessageCount?: number;
  /** Whether active-character detection and sheet synchronization are enabled. */
  characterSheetsAutoSyncEnabled?: boolean;
  /** Number of saved user turns between Character Sheet synchronization proposals. */
  characterSheetsSyncInterval?: number;
  /** Saved user-turn count since the previous synchronization proposal. */
  characterSheetsMessagesSinceLastSync?: number;
}
