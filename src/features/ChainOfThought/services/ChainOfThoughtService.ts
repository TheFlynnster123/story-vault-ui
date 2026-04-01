import { d } from "../../../services/Dependencies";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";
import type {
  ChainOfThought,
  ChainOfThoughtExecution,
  ChainOfThoughtStep,
} from "./ChainOfThought";
import {
  applyChainOfThoughtDefaults,
  DEFAULT_CHAIN_OF_THOUGHT_NAME,
  DEFAULT_CHAIN_OF_THOUGHT_STEPS,
} from "./ChainOfThought";

export const getChainOfThoughtServiceInstance = createInstanceCache(
  (chatId: string) => new ChainOfThoughtService(chatId),
);

const migrateLoadedChainOfThought = (
  data: ChainOfThought | null | undefined,
): ChainOfThought => {
  if (!data) {
    // Create default chain of thought if none exists
    return {
      id: "default",
      name: DEFAULT_CHAIN_OF_THOUGHT_NAME,
      steps: DEFAULT_CHAIN_OF_THOUGHT_STEPS,
    };
  }
  return applyChainOfThoughtDefaults(data);
};

/**
 * Manages the single Chain of Thought for a chat.
 * There is only one chain of thought per chat (not multiple templates).
 * Stores both the definition (steps) and execution results.
 */
export class ChainOfThoughtService {
  private chatId: string;
  private subscribers = new Set<() => void>();
  private initialized: boolean = false;
  public ChainOfThought: ChainOfThought | null = null;
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
      await this.loadChainOfThought();
      this.initialized = true;
    }
  }

  private async loadChainOfThought(): Promise<void> {
    this.IsLoading = true;
    try {
      this.ChainOfThought = await this.fetchChainOfThought();
      this.notifySubscribers();
    } finally {
      this.IsLoading = false;
    }
  }

  public fetchChainOfThought = async (): Promise<ChainOfThought> => {
    const data = await d.ChainOfThoughtManagedBlob(this.chatId).get();
    return migrateLoadedChainOfThought(data);
  };

  // ---- Public API ----

  public getChainOfThought = (): ChainOfThought | null => this.ChainOfThought;

  public updateChainOfThoughtDefinition = (
    field: keyof Pick<ChainOfThought, "name" | "steps">,
    value: string | ChainOfThoughtStep[],
  ): void => {
    if (!this.ChainOfThought) return;
    this.ChainOfThought = { ...this.ChainOfThought, [field]: value };
    this.notifySubscribers();
    this.saveDebounced();
  };

  public updateStep = (
    stepId: string,
    field: keyof ChainOfThoughtStep,
    value: string | boolean,
  ): void => {
    if (!this.ChainOfThought) return;
    this.ChainOfThought = {
      ...this.ChainOfThought,
      steps: this.ChainOfThought.steps.map((step) =>
        step.id === stepId ? { ...step, [field]: value } : step,
      ),
    };
    this.notifySubscribers();
    this.saveDebounced();
  };

  public addStep = (step: ChainOfThoughtStep): void => {
    if (!this.ChainOfThought) return;
    this.ChainOfThought = {
      ...this.ChainOfThought,
      steps: [...this.ChainOfThought.steps, step],
    };
    this.notifySubscribers();
    this.saveDebounced();
  };

  public removeStep = (stepId: string): void => {
    if (!this.ChainOfThought) return;
    this.ChainOfThought = {
      ...this.ChainOfThought,
      steps: this.ChainOfThought.steps.filter((step) => step.id !== stepId),
    };
    this.notifySubscribers();
    this.saveDebounced();
  };

  // ---- Execution Results ----

  public setLastExecution = (execution: ChainOfThoughtExecution): void => {
    if (!this.ChainOfThought) return;
    this.ChainOfThought = {
      ...this.ChainOfThought,
      lastExecution: execution,
    };
    this.notifySubscribers();
    this.saveDebounced();
  };

  public getLastExecution = (): ChainOfThoughtExecution | undefined =>
    this.ChainOfThought?.lastExecution;

  // ---- Persistence ----

  public async savePendingChanges(): Promise<void> {
    await d.ChainOfThoughtManagedBlob(this.chatId).savePendingChanges();
  }

  public save = async (chainOfThought?: ChainOfThought): Promise<void> => {
    this.IsLoading = true;

    try {
      const data = chainOfThought ?? this.ChainOfThought;
      await d.ChainOfThoughtManagedBlob(this.chatId).save(data);

      if (chainOfThought) {
        this.ChainOfThought = chainOfThought;
      }

      this.notifySubscribers();
    } finally {
      this.IsLoading = false;
    }
  };

  public saveDebounced = async (
    chainOfThought?: ChainOfThought,
  ): Promise<void> => {
    const data = chainOfThought ?? this.ChainOfThought;
    await d.ChainOfThoughtManagedBlob(this.chatId).saveDebounced(data);

    if (chainOfThought) {
      this.ChainOfThought = chainOfThought;
      this.notifySubscribers();
    }
  };
}
