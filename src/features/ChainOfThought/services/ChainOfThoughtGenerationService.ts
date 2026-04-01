import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";
import { toSystemMessage } from "../../../services/Utils/MessageUtils";
import type { ChainOfThought } from "./ChainOfThought";

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

export class ChainOfThoughtGenerationService {
  private chatId: string;
  private generatingCotIds = new Set<string>();
  private subscribers = new Set<() => void>();

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  // ---- Generation State ----

  public subscribe = (callback: () => void): (() => void) => {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  };

  public isGenerating = (cotId: string): boolean =>
    this.generatingCotIds.has(cotId);

  public getGeneratingCotIds = (): ReadonlySet<string> =>
    this.generatingCotIds;

  private trackGeneration = async (
    cotId: string,
    operation: () => Promise<void>,
  ): Promise<void> => {
    this.generatingCotIds.add(cotId);
    this.notifySubscribers();
    try {
      await operation();
    } finally {
      this.generatingCotIds.delete(cotId);
      this.notifySubscribers();
    }
  };

  private notifySubscribers = (): void => {
    this.subscribers.forEach((callback) => callback());
  };

  // ---- Public API ----

  /**
   * Execute a chain of thought reasoning process.
   * Each step is executed sequentially, with the output of each step
   * being temporarily stored in memory and used as context for the next step.
   */
  public executeChainOfThought = async (cotId: string): Promise<void> => {
    const cot = this.findChainOfThought(cotId);
    if (!cot) return;

    await this.trackGeneration(cotId, async () => {
      // First, hide any previous chain of thought messages for this definition
      await d.ChatService(this.chatId).HideChainOfThought(cotId);

      // Get the base chat messages (excluding plan messages if needed)
      const baseChatMessages = d.LLMChatProjection(this.chatId).GetMessages();

      // Execute each step sequentially
      const stepOutputs: { stepId: string; content: string }[] = [];

      for (const step of cot.steps) {
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
        const previousStepsContext = stepOutputs
          .map(
            (output) =>
              `--- Step ${cot.steps.findIndex((s) => s.id === output.stepId) + 1} Output ---\n${output.content}`,
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

        // Store the step output
        stepOutputs.push({ stepId: step.id, content });

        // Save this step as a CQRS event
        const stepIndex = cot.steps.indexOf(step);
        await d
          .ChatService(this.chatId)
          .AddChainOfThoughtStepMessage(
            cotId,
            cot.name,
            stepIndex,
            step.prompt,
            content,
          );
      }
    });
  };

  // ---- Private Helpers ----

  private findChainOfThought = (cotId: string): ChainOfThought | undefined =>
    d
      .ChainOfThoughtService(this.chatId)
      .getChainOfThoughts()
      .find((c) => c.id === cotId);
}

/**
 * Strips wrapping markdown code fences (```markdown ... ```) that
 * LLMs sometimes add around their response.
 */
const stripMarkdownCodeFence = (text: string): string =>
  text.replace(/^```(?:markdown)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
