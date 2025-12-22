import type { LLMMessage } from "../../cqrs/LLMChatProjection";
import type { Plan } from "../../models";
import { toSystemMessage } from "../../utils/messageUtils";
import { d } from "../Dependencies/Dependencies";

const PLAN_BLOB_NAME = "plan";

export const getPlanQueryKey = (chatId: string) => ["plan", chatId];

// Singleton instances
const planServiceInstances = new Map<string, PlanService>();

export const getPlanServiceInstance = (
  chatId: string | null
): PlanService | null => {
  if (!chatId) return null;

  if (!planServiceInstances.has(chatId))
    planServiceInstances.set(chatId, new PlanService(chatId));

  return planServiceInstances.get(chatId)!;
};

export class PlanService {
  public Plans: Plan[] = [];
  public IsLoading: boolean = false;

  private chatId: string;
  private initialized: boolean = false;
  private subscribers = new Set<() => void>();

  constructor(chatId: string) {
    this.chatId = chatId;
    this.initializePlansIfNeeded();
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  private async initializePlansIfNeeded(): Promise<void> {
    if (!this.initialized) {
      await this.loadPlans();
      this.initialized = true;
    }
  }

  private async loadPlans(): Promise<void> {
    this.IsLoading = true;
    try {
      this.Plans = await this.fetchPlans();
      this.notifySubscribers();
    } finally {
      this.IsLoading = false;
    }
  }

  public fetchPlans = async (): Promise<Plan[]> => {
    return (await d.QueryClient().ensureQueryData({
      queryKey: getPlanQueryKey(this.chatId),
      queryFn: async () => await this.fetchPlansFromBlob(),
    })) as Plan[];
  };

  private fetchPlansFromBlob = async (): Promise<Plan[]> => {
    try {
      const blobContent = await d
        .BlobAPI()
        .getBlob(this.chatId, PLAN_BLOB_NAME);

      if (!blobContent) return [];

      return JSON.parse(blobContent) as Plan[];
    } catch (e) {
      if (e instanceof Error && e.message.includes("Blob not found")) return [];

      d.ErrorService().log("Failed to fetch plans", e);
      return [];
    }
  };

  public getPlans(): Plan[] {
    return this.Plans;
  }

  public updatePlanContent(planId: string, content: string): void {
    const plan = this.Plans.find((p) => p.id === planId);
    if (plan) {
      plan.content = content;
      this.notifySubscribers();
    }
  }

  public updatePlanDefinition(
    planId: string,
    field: keyof Plan,
    value: string
  ): void {
    const plan = this.Plans.find((p) => p.id === planId);
    if (plan) {
      (plan[field] as string) = value;
      this.notifySubscribers();
    }
  }

  public addPlan(plan: Plan): void {
    this.Plans.push(plan);
    this.notifySubscribers();
  }

  public removePlan(planId: string): void {
    this.Plans = this.Plans.filter((p) => p.id !== planId);
    this.notifySubscribers();
  }

  public setAllPlans(plans: Plan[]): void {
    this.Plans = plans;
    this.notifySubscribers();
  }

  public async savePlans(plans?: Plan[]): Promise<void> {
    this.IsLoading = true;
    try {
      const plansToSave = plans ?? this.Plans;
      const blobContent = JSON.stringify(plansToSave);
      await d.BlobAPI().saveBlob(this.chatId, PLAN_BLOB_NAME, blobContent);

      if (plans) {
        this.Plans = plans;
      }

      d.QueryClient().setQueryData(getPlanQueryKey(this.chatId), plansToSave);

      this.notifySubscribers();
    } finally {
      this.IsLoading = false;
    }
  }

  public async refreshFromDatabase(): Promise<void> {
    await this.loadPlans();
  }

  public generateUpdatedPlans = async (
    chatMessages: LLMMessage[]
  ): Promise<void> => {
    this.IsLoading = true;
    try {
      const processPromises = this.Plans.map(
        async (plan) => await this.generatePlanContent(plan, chatMessages)
      );

      this.Plans = await Promise.all(processPromises);
      this.notifySubscribers();
    } finally {
      this.IsLoading = false;
    }
  };

  private generatePlanContent = async (
    plan: Plan,
    chatMessages: LLMMessage[]
  ) => {
    const promptMessages: LLMMessage[] = [
      ...chatMessages,
      toSystemMessage(
        `#${plan.name}\r\n
          ~ Consider the chat history above, and generate a plan in Markdown without preamble or additional text ~
          ${plan.prompt}
          \r\n
          =====
          \r\n`
      ),
    ];

    const response = await d.GrokChatAPI().postChat(promptMessages);

    return { ...plan, content: response };
  };
}
