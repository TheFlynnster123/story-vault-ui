import type { AgentClarificationCreatedEvent } from "./ChatEvent";

export class AgentClarificationCreatedEventUtil {
  public static Create(
    question: string,
    answer: string,
  ): AgentClarificationCreatedEvent {
    return {
      type: "AgentClarificationCreated",
      clarificationId: this.generateClarificationId(),
      question,
      answer,
    };
  }

  private static generateClarificationId(): string {
    return `clarification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
