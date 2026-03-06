import { d } from "../../../services/Dependencies";
import type { Plan } from "./Plan";
import { applyPlanDefaults } from "./Plan";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";

export const getPlanServiceInstance = createInstanceCache(
  (chatId: string) => new PlanService(chatId),
);

const migrateLoadedPlans = (plans: Plan[]): Plan[] =>
  plans.map(applyPlanDefaults);

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
    const data = await d.PlansManagedBlob(this.chatId).get();
    return migrateLoadedPlans(data ?? []);
  };

  public getPlans(): Plan[] {
    return this.Plans;
  }

  public updatePlanContent(planId: string, content: string): void {
    const plan = this.Plans.find((p) => p.id === planId);
    if (plan) {
      plan.content = content;
      this.notifySubscribers();
      this.savePlansDebounced();
    }
  }

  public updatePlanDefinition(
    planId: string,
    field: keyof Plan,
    value: string | number,
  ): void {
    const plan = this.Plans.find((p) => p.id === planId);
    if (plan) {
      (plan[field] as string | number) = value;
      this.notifySubscribers();
      this.savePlansDebounced();
    }
  }

  public addPlan(plan: Plan): void {
    this.Plans.push(plan);
    this.notifySubscribers();
    this.savePlansDebounced();
  }

  public removePlan(planId: string): void {
    this.Plans = this.Plans.filter((p) => p.id !== planId);
    this.notifySubscribers();
    this.savePlansDebounced();
  }

  public async savePendingChanges(): Promise<void> {
    await d.PlansManagedBlob(this.chatId).savePendingChanges();
  }

  public async savePlans(plans?: Plan[]): Promise<void> {
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

  public async savePlansDebounced(plans?: Plan[]): Promise<void> {
    const plansToSave = plans ?? this.Plans;
    await d.PlansManagedBlob(this.chatId).saveDebounced(plansToSave);

    if (plans) {
      this.Plans = plans;
      this.notifySubscribers();
    }
  }
}
