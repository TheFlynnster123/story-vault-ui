import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";

export interface SystemSettings {
  chatGenerationSettings?: ChatGenerationSettings;
  openRouterMonitoringSettings?: OpenRouterMonitoringSettings;
  chapterCompressionSettings?: ChapterCompressionSettings;
}

export interface ChatGenerationSettings extends OpenRouterRequestSettings {
  model?: string;
}

export interface OpenRouterMonitoringSettings {
  trackedRequestLimit?: number;
  hideMessageBodiesByDefault?: boolean;
}

export interface ChapterCompressionSettings {
  /**
   * Number of covered messages from the most recent chapter to keep in LLM
   * context until enough new visible messages have accumulated after it.
   */
  trailingChapterMessages?: number;
}

export const DEFAULT_TRAILING_CHAPTER_MESSAGES = 6;
