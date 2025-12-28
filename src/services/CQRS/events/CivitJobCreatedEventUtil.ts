import type { CivitJobCreatedEvent } from "./ChatEvent";

export class CivitJobCreatedEventUtil {
  public static Create(jobId: string, prompt: string): CivitJobCreatedEvent {
    return {
      type: "CivitJobCreated",
      jobId,
      prompt,
    };
  }
}
