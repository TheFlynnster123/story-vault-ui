export interface ChatSettings {
  timestampCreatedUtcMs: number;
  chatTitle: string;
  backgroundPhotoBase64?: string;
  backgroundPhotoCivitJobId?: string;
  prompt: string;
  customPrompt?: string;
}
