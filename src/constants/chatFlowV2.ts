export const CHAT_FLOW_V2_TEMPLATES = {
  PLANNING_PROMPT:
    "Planning Notes - Respond with ONLY the following template filled out. Do not provide a draft message yet:\n" +
    "Where are we at in the story flow? Should we continue engaging in dialogue, should we expand and let develop the current plot point, does another plot point need introducing?",

  SYSTEM_MESSAGE_PROMPT:
    "Without a preamble, take into consideration the user's most recent response and our planning notes, write your response.",

  REFINEMENT_PROMPT:
    "Refinement Notes - Analyze the most recent system message and provide feedback. Respond with ONLY the following template filled out:\n\n" +
    "Are there errors in the story continuity?\n" +
    "Does the dialogue make sense?\n" +
    "Is the dialogue engaging?\n" +
    "Is there repetition?\n" +
    "Any last-minute additions that would improve our response?\n\n" +
    "Provide specific, actionable feedback for improving the response.",

  REFINED_MESSAGE_PROMPT:
    "Without a preamble, take into consideration the refinement notes and improve the previous response. Write the refined message.",

  ANALYSIS_PROMPT:
    "Analysis Notes - Analyze the conversation flow and provide direction for the next message. Consider:\n\n" +
    "Where are we at in the story flow?\n" +
    "Should we continue engaging in dialogue?\n" +
    "Should we expand and let develop the current plot point?\n" +
    "Does another plot point need introducing?\n" +
    "What themes or character development opportunities are emerging?\n" +
    "What would be the most engaging direction for the story to take next?\n\n" +
    "Provide strategic guidance for the next response to maintain story momentum and engagement.",
} as const;

export const CHAT_FLOW_V2_PROGRESS_MESSAGES = {
  PROCESSING_USER_MESSAGE: "Processing user message...",
  GENERATING_PLANNING_NOTES: "Generating planning notes...",
  GENERATING_SYSTEM_MESSAGE: "Writing initial response...",
  GENERATING_REFINEMENT_NOTES: "Analyzing response for improvements...",
  GENERATING_REFINED_MESSAGE: "Refining response...",
  GENERATING_ANALYSIS_NOTES: "Analyzing conversation flow...",
  COMPLETE: "Complete",
} as const;

export const CHAT_FLOW_V2_CONFIG = {
  NOTE_INSERTION_OFFSET: 7, // Number of messages from the end to insert notes
  ENABLE_REFINEMENT: true, // Feature flag for refinement step
  ENABLE_ANALYSIS: true, // Feature flag for analysis step
  AUTO_SAVE_NOTES: true, // Whether to automatically save notes
  CONSOLIDATE_MESSAGES: true, // Whether to consolidate messages for note generation
} as const;

export type ChatFlowV2State =
  | "idle"
  | "processing_user_message"
  | "generating_planning_notes"
  | "generating_system_message"
  | "generating_refinement_notes"
  | "generating_refined_message"
  | "generating_analysis_notes"
  | "complete"
  | "error";

export interface ChatFlowV2Step {
  id: string;
  stepType:
    | "planning_notes"
    | "system_message"
    | "refinement_notes"
    | "refined_message"
    | "analysis_notes";
  content: string;
  timestamp: number;
}
