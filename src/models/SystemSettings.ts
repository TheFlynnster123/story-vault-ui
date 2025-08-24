import type { ChatGenerationSettings } from "./ChatGenerationSettings";
import type { ImageGenerationSettings } from "./ImageGenerationSettings";

export interface SystemSettings {
  chatGenerationSettings?: ChatGenerationSettings;
  imageGenerationSettings?: ImageGenerationSettings;
}
