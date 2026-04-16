export interface ChatSettings {
  timestampCreatedUtcMs: number;
  chatTitle: string;
  backgroundPhotoBase64?: string;
  backgroundPhotoCivitJobId?: string;
  prompt: string;
  customPrompt?: string;
  /** Per-chat model override. When set, overrides the system default model. */
  modelOverride?: string;
  /** Per-chat message transparency (0-1). When set, overrides the default. */
  messageTransparency?: number;
}
