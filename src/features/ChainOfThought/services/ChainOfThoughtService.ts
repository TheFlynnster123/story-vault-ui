import { d } from "../../../services/Dependencies";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";
import type { ChainOfThought, ChainOfThoughtStep } from "./ChainOfThought";
import { applyChainOfThoughtDefaults } from "./ChainOfThought";

export const getChainOfThoughtServiceInstance = createInstanceCache(
  (chatId: string) => new ChainOfThoughtService(chatId),
);

export class ChainOfThoughtService {
  private chatId: string;
  private subscribers = new Set<() => void>();
  public ChainOfThoughts: ChainOfThought[] = [];
  public IsLoading = true;

  constructor(chatId: string) {
    this.chatId = chatId;
    this.initialize();
  }

  // ---- Observable Pattern ----

  public subscribe = (callback: () => void): (() => void) => {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  };

  private notifySubscribers = (): void => {
    this.subscribers.forEach((callback) => callback());
  };

  // ---- Initialization ----

  private initialize = async (): Promise<void> => {
    try {
      const blob = d.ChainOfThoughtManagedBlob(this.chatId);
      const data = await blob.load();
      this.ChainOfThoughts = data.map(applyChainOfThoughtDefaults);
      this.IsLoading = false;
      this.notifySubscribers();
    } catch (error) {
      d.ErrorService().log("Failed to load chain of thoughts", error);
      this.IsLoading = false;
      this.notifySubscribers();
    }
  };

  // ---- Public API ----

  public getChainOfThoughts = (): ChainOfThought[] => this.ChainOfThoughts;

  public addChainOfThought = (cot: ChainOfThought): void => {
    this.ChainOfThoughts = [...this.ChainOfThoughts, cot];
    this.notifySubscribers();
    this.savePlansDebounced();
  };

  public removeChainOfThought = (cotId: string): void => {
    this.ChainOfThoughts = this.ChainOfThoughts.filter((c) => c.id !== cotId);
    this.notifySubscribers();
    this.savePlansDebounced();
  };

  public updateChainOfThoughtDefinition = (
    cotId: string,
    field: keyof ChainOfThought,
    value: string | ChainOfThoughtStep[],
  ): void => {
    this.ChainOfThoughts = this.ChainOfThoughts.map((cot) =>
      cot.id === cotId ? { ...cot, [field]: value } : cot,
    );
    this.notifySubscribers();
    this.savePlansDebounced();
  };

  public updateStep = (
    cotId: string,
    stepId: string,
    field: keyof ChainOfThoughtStep,
    value: string | boolean,
  ): void => {
    this.ChainOfThoughts = this.ChainOfThoughts.map((cot) =>
      cot.id === cotId
        ? {
            ...cot,
            steps: cot.steps.map((step) =>
              step.id === stepId ? { ...step, [field]: value } : step,
            ),
          }
        : cot,
    );
    this.notifySubscribers();
    this.savePlansDebounced();
  };

  public addStep = (cotId: string, step: ChainOfThoughtStep): void => {
    this.ChainOfThoughts = this.ChainOfThoughts.map((cot) =>
      cot.id === cotId
        ? {
            ...cot,
            steps: [...cot.steps, step],
          }
        : cot,
    );
    this.notifySubscribers();
    this.savePlansDebounced();
  };

  public removeStep = (cotId: string, stepId: string): void => {
    this.ChainOfThoughts = this.ChainOfThoughts.map((cot) =>
      cot.id === cotId
        ? {
            ...cot,
            steps: cot.steps.filter((step) => step.id !== stepId),
          }
        : cot,
    );
    this.notifySubscribers();
    this.savePlansDebounced();
  };

  // ---- Persistence ----

  public savePlans = async (
    chainOfThoughts?: ChainOfThought[],
  ): Promise<void> => {
    const data = chainOfThoughts ?? this.ChainOfThoughts;
    await d.ChainOfThoughtManagedBlob(this.chatId).save(data);
  };

  public savePlansDebounced = (
    chainOfThoughts?: ChainOfThought[],
  ): void => {
    const data = chainOfThoughts ?? this.ChainOfThoughts;
    d.ChainOfThoughtManagedBlob(this.chatId).saveDebounced(data);
  };

  public savePendingChanges = (): void => {
    d.ChainOfThoughtManagedBlob(this.chatId).flushPendingSave();
  };
}
