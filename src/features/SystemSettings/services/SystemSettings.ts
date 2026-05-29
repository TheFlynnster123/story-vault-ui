import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";

export interface SystemSettings {
  chatGenerationSettings?: ChatGenerationSettings;
  openRouterMonitoringSettings?: OpenRouterMonitoringSettings;
}

export interface ChatGenerationSettings extends OpenRouterRequestSettings {
  model?: string;
}

export interface OpenRouterMonitoringSettings {
  trackedRequestLimit?: number;
  hideMessageBodiesByDefault?: boolean;
}
