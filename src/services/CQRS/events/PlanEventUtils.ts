import type { PlanCreatedEvent, PlanHiddenEvent } from "./ChatEvent";

export class PlanCreatedEventUtil {
  public static Create(
    planDefinitionId: string,
    planName: string,
    content: string,
  ): PlanCreatedEvent {
    return {
      type: "PlanCreated",
      messageId: this.generateMessageId(),
      planDefinitionId,
      planName,
      content,
    };
  }

  static generateMessageId(): string {
    return `plan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export class PlanHiddenEventUtil {
  public static Create(planDefinitionId: string): PlanHiddenEvent {
    return {
      type: "PlanHidden",
      planDefinitionId,
    };
  }
}
