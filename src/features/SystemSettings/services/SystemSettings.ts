import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";

export interface SystemSettings {
  chatGenerationSettings?: ChatGenerationSettings;
  openRouterMonitoringSettings?: OpenRouterMonitoringSettings;
  chapterCompressionSettings?: ChapterCompressionSettings;
  messageCompressionSettings?: MessageCompressionSettings;
}

export interface ChatGenerationSettings extends OpenRouterRequestSettings {
  model?: string;
}

export interface OpenRouterMonitoringSettings {
  trackedRequestLimit?: number;
}

export interface ChapterCompressionSettings {
  /**
   * Number of covered messages from the most recent chapter to keep in LLM
   * context until enough new visible messages have accumulated after it.
   */
  trailingChapterMessages?: number;
}

export const DEFAULT_TRAILING_CHAPTER_MESSAGES = 6;

export interface MessageCompressionSettings {
  enabled?: boolean;
  afterMessages?: number;
  minimumCharacters?: number;
}

export const DEFAULT_MESSAGE_COMPRESSION_AFTER_MESSAGES = 8;
export const DEFAULT_MESSAGE_COMPRESSION_MINIMUM_CHARACTERS = 400;

export const normalizeMessageCompressionAfterMessages = (
  value: unknown,
): number =>
  normalizeNonNegativeInteger(
    value,
    DEFAULT_MESSAGE_COMPRESSION_AFTER_MESSAGES,
  );

export const normalizeMessageCompressionMinimumCharacters = (
  value: unknown,
): number =>
  normalizeNonNegativeInteger(
    value,
    DEFAULT_MESSAGE_COMPRESSION_MINIMUM_CHARACTERS,
  );

const normalizeNonNegativeInteger = (
  value: unknown,
  fallback: number,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
};
