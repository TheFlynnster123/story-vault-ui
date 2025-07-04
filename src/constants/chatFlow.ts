export const CHAT_FLOW_TEMPLATES = {
  RESPONSE_PROMPT:
    "Without a preamble, take into consideration the user's most recent response and our notes, write your response.",
} as const;

export const PROGRESS_MESSAGES = {
  PLANNING_NOTES: "Planning response...",
  RESPONSE_MESSAGE: "Writing response...",
} as const;

export const CHAT_FLOW_CONFIG = {
  NOTE_INSERTION_OFFSET: 7, // Number of messages from the end to insert notes
} as const;
