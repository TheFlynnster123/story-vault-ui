import { d } from "../../../services/Dependencies";
import type { Plan } from "./Plan";

// Singleton instances
const planServiceInstances = new Map<string, PlanService>();

export const getPlanServiceInstance = (
  chatId: string | null,
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
      this.Plans = await this.FetchPlans();
      this.notifySubscribers();
    } finally {
      this.IsLoading = false;
    }
  }

  public FetchPlans = async (): Promise<Plan[]> => {
    const data = await d.PlansManagedBlob(this.chatId).get();
    return data ?? [];
  };

  public GetPlans(): Plan[] {
    return this.Plans;
  }

  public UpdatePlanContent(planId: string, content: string): void {
    const plan = this.Plans.find((p) => p.id === planId);
    if (plan) {
      plan.content = content;
      this.notifySubscribers();
      this.SavePlansDebounced();
    }
  }

  public UpdatePlanDefinition(
    planId: string,
    field: keyof Plan,
    value: string,
  ): void {
    const plan = this.Plans.find((p) => p.id === planId);
    if (plan) {
      (plan[field] as string) = value;
      this.notifySubscribers();
      this.SavePlansDebounced();
    }
  }

  public AddPlan(plan: Plan): void {
    this.Plans.push(plan);
    this.notifySubscribers();
    this.SavePlansDebounced();
  }

  public RemovePlan(planId: string): void {
    this.Plans = this.Plans.filter((p) => p.id !== planId);
    this.notifySubscribers();
    this.SavePlansDebounced();
  }

  public async SavePendingChanges(): Promise<void> {
    await d.PlansManagedBlob(this.chatId).savePendingChanges();
  }

  public async SavePlans(plans?: Plan[]): Promise<void> {
    this.IsLoading = true;

    try {
      const plansToSave = plans ?? this.Plans;
      await d.PlansManagedBlob(this.chatId).save(plansToSave);

      if (plans) {
        this.Plans = plans;
      }

      this.notifySubscribers();
    } finally {
      this.IsLoading = false;
    }
  }

  public async SavePlansDebounced(plans?: Plan[]): Promise<void> {
    const plansToSave = plans ?? this.Plans;
    await d.PlansManagedBlob(this.chatId).saveDebounced(plansToSave);

    if (plans) {
      this.Plans = plans;
      this.notifySubscribers();
    }
  }
}
