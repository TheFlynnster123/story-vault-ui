import type {
  CivitWorkflowCreatedEvent,
  CivitWorkflowGenerationStatus,
  CivitWorkflowUpdatedEvent,
} from "./ChatEvent";

export interface CivitWorkflowExtras {
  workflowId?: string;
  modelName?: string;
  modelId?: string;
  modelSource?: "system" | "variant";
  characterDescription?: string;
  characterName?: string;
  basePrompt?: string;
  sceneDescription?: string;
  generationStatus?: CivitWorkflowGenerationStatus;
  generationError?: string;
  costAmount?: number;
  costCurrency?: string;
}

export class CivitWorkflowCreatedEventUtil {
  public static Create(
    messageId: string,
    prompt: string,
    extras?: CivitWorkflowExtras,
  ): CivitWorkflowCreatedEvent {
    return {
      type: "CivitWorkflowCreated",
      messageId,
      prompt,
      ...extras,
    };
  }
}

export class CivitWorkflowUpdatedEventUtil {
  public static Create(
    messageId: string,
    patch: CivitWorkflowUpdatedEvent["patch"],
  ): CivitWorkflowUpdatedEvent {
    return {
      type: "CivitWorkflowUpdated",
      messageId,
      patch,
    };
  }
}
