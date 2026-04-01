/**
 * A step in a chain of thought reasoning process.
 * Each step has its own prompt, model, and options for controlling
 * how the chat history is presented to the LLM.
 */
export interface ChainOfThoughtStep {
  id: string;
  prompt: string;
  model?: string;
  enabled: boolean;
  includePlanningMessages: boolean;
  consolidateMessageHistory: boolean;
}

/**
 * A Chain of Thought template that defines a multi-step reasoning process.
 * The template is stored in blob storage, while the actual reasoning outputs
 * are temporarily stored in memory (CQRS events).
 */
export interface ChainOfThought {
  id: string;
  name: string;
  steps: ChainOfThoughtStep[];
}

export const DEFAULT_CHAIN_OF_THOUGHT_NAME = "Chain of Thought";

export const DEFAULT_CHAIN_OF_THOUGHT_STEPS: ChainOfThoughtStep[] = [
  {
    id: "step-1",
    prompt:
      "You are an expert story editor. Consider the story above. Show your reasoning for what the story direction for the next few paragraphs should be.",
    enabled: true,
    includePlanningMessages: false,
    consolidateMessageHistory: false,
  },
  {
    id: "step-2",
    prompt:
      "You are an expert critic. Consider the draft of the story direction. Relative to the story so far and what the user's preferences seem to be, what stands out as bland, or repetitive? Can you suggest alternatives?",
    enabled: true,
    includePlanningMessages: false,
    consolidateMessageHistory: false,
  },
  {
    id: "step-3",
    prompt:
      "You are an expert writer. Draft a message based off the above reasoning. Use realistic and vivid writing styles.",
    enabled: true,
    includePlanningMessages: false,
    consolidateMessageHistory: false,
  },
  {
    id: "step-4",
    prompt:
      "You are an expert story editor. Considering the prior message content, is there anything here that is formulaic, or repetitive? This writer tends to have a repetitive style, completely rework the message below to ensure it is absolutely novel if necessary. Respond with ONLY the message content.",
    enabled: true,
    includePlanningMessages: false,
    consolidateMessageHistory: false,
  },
];

export const applyChainOfThoughtDefaults = (
  cot: Partial<ChainOfThought> & {
    id: string;
    name: string;
  },
): ChainOfThought => ({
  id: cot.id,
  name: cot.name,
  steps: cot.steps ?? DEFAULT_CHAIN_OF_THOUGHT_STEPS,
});

export const applyStepDefaults = (
  step: Partial<ChainOfThoughtStep> & {
    id: string;
    prompt: string;
  },
): ChainOfThoughtStep => ({
  id: step.id,
  prompt: step.prompt,
  model: step.model,
  enabled: step.enabled ?? true,
  includePlanningMessages: step.includePlanningMessages ?? false,
  consolidateMessageHistory: step.consolidateMessageHistory ?? false,
});
