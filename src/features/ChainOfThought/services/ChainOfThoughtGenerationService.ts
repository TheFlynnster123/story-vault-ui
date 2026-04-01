import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";
import { toSystemMessage } from "../../../services/Utils/MessageUtils";
import type { ChainOfThoughtStepResult } from "./ChainOfThought";

export const getChainOfThoughtGenerationServiceInstance = createInstanceCache(
  (chatId: string) => new ChainOfThoughtGenerationService(chatId),
);

const consolidateMessagesToString = (messages: LLMMessage[]): string =>
  messages
    .map((msg) => {
      const roleLabel =
        msg.role === "user"
          ? "User"
          : msg.role === "assistant"
            ? "Assistant"
            : "System";
      return `${roleLabel}: ${msg.content}`;
    })
    .join("\n\n");

/**
 * Service for executing chain of thought reasoning.
 * This is a pre-message process - the final step becomes the actual message.
 * Execution results are stored in ChainOfThoughtService, not as CQRS events.
 */
export class ChainOfThoughtGenerationService {
  private chatId: string;
  private isGenerating = false;
  private subscribers = new Set<() => void>();

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  // ---- Generation State ----

  public subscribe = (callback: () => void): (() => void) => {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  };

  public getIsGenerating = (): boolean => this.isGenerating;

  private trackGeneration = async (
    operation: () => Promise<void>,
  ): Promise<void> => {
    this.isGenerating = true;
    this.notifySubscribers();
    try {
      await operation();
    } finally {
      this.isGenerating = false;
      this.notifySubscribers();
    }
  };

  private notifySubscribers = (): void => {
    this.subscribers.forEach((callback) => callback());
  };

  // ---- Public API ----

  /**
   * Execute the chain of thought reasoning process.
   * Each step is executed sequentially, building upon previous steps.
   * The final step output becomes the actual message (if the caller chooses to use it).
   * Results are stored in ChainOfThoughtService, not as CQRS events.
   */
  public executeChainOfThought = async (): Promise<string | undefined> => {
    const cot = d.ChainOfThoughtService(this.chatId).getChainOfThought();
    if (!cot) return undefined;

    let finalMessage: string | undefined;

    await this.trackGeneration(async () => {
      // Get the base chat messages
      const baseChatMessages = d.LLMChatProjection(this.chatId).GetMessages();

      // Execute each step sequentially
      const stepResults: ChainOfThoughtStepResult[] = [];

      for (let i = 0; i < cot.steps.length; i++) {
        const step = cot.steps[i];
        if (!step.enabled) continue;

        // Build the context for this step
        let chatMessages = baseChatMessages;

        // Optionally exclude plan messages
        if (!step.includePlanningMessages) {
          chatMessages = d
            .LLMChatProjection(this.chatId)
            .GetMessagesExcludingAllPlans();
        }

        // Add previous step outputs as system messages
        const previousStepsContext = stepResults
          .map(
            (result) =>
              `--- Step ${result.stepIndex + 1} Output ---\n${result.content}`,
          )
          .join("\n\n");

        // Build the prompt messages
        let promptMessages: LLMMessage[];
        if (step.consolidateMessageHistory) {
          const consolidatedHistory = consolidateMessagesToString(chatMessages);
          const systemContent = [
            `Chat History:\n\n${consolidatedHistory}`,
            previousStepsContext && `\n\n${previousStepsContext}`,
            `\n\n---\n\n${step.prompt}`,
          ]
            .filter(Boolean)
            .join("");
          promptMessages = [toSystemMessage(systemContent)];
        } else {
          promptMessages = [...chatMessages];
          if (previousStepsContext) {
            promptMessages.push(toSystemMessage(previousStepsContext));
          }
          promptMessages.push(toSystemMessage(step.prompt));
        }

        // Execute the step
        const response = await d
          .OpenRouterChatAPI()
          .postChat(promptMessages, step.model || undefined);
        const content = stripMarkdownCodeFence(response);

        // Store the step result
        stepResults.push({
          stepId: step.id,
          stepIndex: i,
          stepPrompt: step.prompt,
          content,
        });

        // If this is the last enabled step, save it as the final message
        const remainingSteps = cot.steps.slice(i + 1);
        const hasMoreEnabledSteps = remainingSteps.some((s) => s.enabled);
        if (!hasMoreEnabledSteps) {
          finalMessage = content;
        }
      }

      // Store the execution result in the service
      d.ChainOfThoughtService(this.chatId).setLastExecution({
        executedAt: new Date().toISOString(),
        stepResults,
        finalMessage,
      });
    });

    return finalMessage;
  };
}

/**
 * Strips wrapping markdown code fences (```markdown ... ```) that
 * LLMs sometimes add around their response.
 */
const stripMarkdownCodeFence = (text: string): string =>
  text.replace(/^```(?:markdown)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
