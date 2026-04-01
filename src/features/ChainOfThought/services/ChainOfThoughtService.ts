import { d } from "../../../services/Dependencies";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";
import type { ChainOfThought, ChainOfThoughtStep } from "./ChainOfThought";
import { applyChainOfThoughtDefaults } from "./ChainOfThought";

export const getChainOfThoughtServiceInstance = createInstanceCache(
  (chatId: string) => new ChainOfThoughtService(chatId),
);

const migrateLoadedChainOfThoughts = (
  chainOfThoughts: ChainOfThought[],
): ChainOfThought[] => chainOfThoughts.map(applyChainOfThoughtDefaults);

export class ChainOfThoughtService {
  private chatId: string;
  private subscribers = new Set<() => void>();
  private initialized: boolean = false;
  public ChainOfThoughts: ChainOfThought[] = [];
  public IsLoading = false;

  constructor(chatId: string) {
    this.chatId = chatId;
    this.initializeIfNeeded();
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

  private async initializeIfNeeded(): Promise<void> {
    if (!this.initialized) {
      await this.loadChainOfThoughts();
      this.initialized = true;
    }
  }

  private async loadChainOfThoughts(): Promise<void> {
    this.IsLoading = true;
    try {
      this.ChainOfThoughts = await this.fetchChainOfThoughts();
      this.notifySubscribers();
    } finally {
      this.IsLoading = false;
    }
  }

  public fetchChainOfThoughts = async (): Promise<ChainOfThought[]> => {
    const data = await d.ChainOfThoughtManagedBlob(this.chatId).get();
    return migrateLoadedChainOfThoughts(data ?? []);
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

  public async savePendingChanges(): Promise<void> {
    await d.ChainOfThoughtManagedBlob(this.chatId).savePendingChanges();
  }

  public savePlans = async (
    chainOfThoughts?: ChainOfThought[],
  ): Promise<void> => {
    this.IsLoading = true;

    try {
      const data = chainOfThoughts ?? this.ChainOfThoughts;
      await d.ChainOfThoughtManagedBlob(this.chatId).save(data);

      if (chainOfThoughts) {
        this.ChainOfThoughts = chainOfThoughts;
      }

      this.notifySubscribers();
    } finally {
      this.IsLoading = false;
    }
  };

  public savePlansDebounced = async (
    chainOfThoughts?: ChainOfThought[],
  ): Promise<void> => {
    const data = chainOfThoughts ?? this.ChainOfThoughts;
    await d.ChainOfThoughtManagedBlob(this.chatId).saveDebounced(data);

    if (chainOfThoughts) {
      this.ChainOfThoughts = chainOfThoughts;
      this.notifySubscribers();
    }
  };
}
