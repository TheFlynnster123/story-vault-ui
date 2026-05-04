import type { CivitJobCreatedEvent } from "./ChatEvent";

export interface CivitJobExtras {
  modelName?: string;
  modelId?: string;
  modelSource?: "system" | "variant";
  characterDescription?: string;
  characterName?: string;
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
