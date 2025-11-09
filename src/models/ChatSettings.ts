export interface ChatSettings {
  timestampCreatedUtcMs: number;
  chatTitle: string;
  backgroundPhotoBase64?: string;
  promptType: "Manual" | "First Person Character";
  customPrompt?: string;
  story?: string;
}
