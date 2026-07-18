import type { TrackedMessage } from "../services/RequestTracker";

export const DEFAULT_VISIBLE_MESSAGE_COUNT = 3;

export const getRecentMessages = (
  messages: TrackedMessage[],
  count: number,
): TrackedMessage[] => messages.slice(-count);
