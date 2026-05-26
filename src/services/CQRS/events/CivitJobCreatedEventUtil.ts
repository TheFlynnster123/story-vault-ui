import type {
  CivitJobCreatedEvent,
  CivitJobGenerationStatus,
  CivitJobUpdatedEvent,
} from "./ChatEvent";

export interface CivitJobExtras {
  modelName?: string;
  modelId?: string;
  modelSource?: "system" | "variant";
  characterDescription?: string;
  characterName?: string;
  basePrompt?: string;
  sceneDescription?: string;
  generationStatus?: CivitJobGenerationStatus;
  generationError?: string;
}

export class CivitJobCreatedEventUtil {
  public static Create(
    jobId: string,
    prompt: string,
    extras?: CivitJobExtras,
  ): CivitJobCreatedEvent {
    return {
      type: "CivitJobCreated",
      jobId,
      prompt,
      ...extras,
    };
  }
}

export class CivitJobUpdatedEventUtil {
  public static Create(
    messageId: string,
    patch: CivitJobUpdatedEvent["patch"],
  ): CivitJobUpdatedEvent {
    return {
      type: "CivitJobUpdated",
      messageId,
      patch,
    };
  }
}
