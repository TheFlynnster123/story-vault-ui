import type {
  ChainOfThoughtStepCreatedEvent,
  ChainOfThoughtHiddenEvent,
} from "./ChatEvent";

export class ChainOfThoughtStepCreatedEventUtil {
  public static Create(
    chainOfThoughtId: string,
    chainOfThoughtName: string,
    stepIndex: number,
    stepPrompt: string,
    content: string,
  ): ChainOfThoughtStepCreatedEvent {
    return {
      type: "ChainOfThoughtStepCreated",
      messageId: `cot-step-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      chainOfThoughtId,
      chainOfThoughtName,
      stepIndex,
      stepPrompt,
      content,
    };
  }
}

export class ChainOfThoughtHiddenEventUtil {
  public static Create(
    chainOfThoughtId: string,
  ): ChainOfThoughtHiddenEvent {
    return {
      type: "ChainOfThoughtHidden",
      chainOfThoughtId,
    };
  }
}
