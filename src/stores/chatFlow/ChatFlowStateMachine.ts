import type { FlowStep, ChatFlowContext } from "./ChatFlowStates";
import {
  ChatFlowState,
  IdleState,
  GeneratingPlanningNotesState,
  GeneratingResponseState,
  CompleteState,
} from "./ChatFlowStates";

export class ChatFlowStateMachine {
  private currentStep: FlowStep = "idle";
  private currentState: ChatFlowState = new IdleState();
  private stateData: any = null;
  private context: ChatFlowContext;
  private onStateChange: (step: FlowStep, data?: any) => void;

  constructor(
    context: ChatFlowContext,
    onStateChange: (step: FlowStep, data?: any) => void
  ) {
    this.context = context;
    this.onStateChange = onStateChange;
  }

  getCurrentStep(): FlowStep {
    return this.currentStep;
  }

  getStateData(): any {
    return this.stateData;
  }

  async startMessageFlow(userMessageText: string): Promise<void> {
    await this.transitionTo("generating-planning-notes", { userMessageText });
  }

  async transitionTo(step: FlowStep, data?: any): Promise<void> {
    this.currentStep = step;
    this.stateData = data;
    this.currentState = this.createStateInstance(step, data);

    // Notify the store of the state change
    this.onStateChange(step, data);

    // Execute the current state
    const result = await this.currentState.execute(this.context);

    // Handle automatic transitions
    if (result.nextStep !== this.currentStep) {
      await this.transitionTo(result.nextStep, result.data);
    }
  }

  private createStateInstance(step: FlowStep, data?: any): ChatFlowState {
    switch (step) {
      case "idle":
        return new IdleState();

      case "generating-planning-notes":
        if (!data?.userMessageText) {
          throw new Error(
            "GeneratingPlanningNotesState requires userMessageText"
          );
        }
        return new GeneratingPlanningNotesState(data.userMessageText);

      case "generating-response":
        if (!data?.planningNotesContext) {
          throw new Error(
            "GeneratingResponseState requires planningNotesContext"
          );
        }
        return new GeneratingResponseState(data.planningNotesContext);

      case "complete":
        return new CompleteState();

      default:
        throw new Error(`Unknown flow step: ${step}`);
    }
  }

  reset(): void {
    this.currentStep = "idle";
    this.currentState = new IdleState();
    this.stateData = null;
    this.onStateChange("idle");
  }
}
