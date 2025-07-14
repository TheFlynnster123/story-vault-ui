export interface ChatGenerationSettings {
  reasoningEffort?: "high" | "low";
  model?: string;
  temperature?: number;
}