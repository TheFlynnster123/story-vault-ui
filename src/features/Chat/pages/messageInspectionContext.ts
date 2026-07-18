export const DEFAULT_INSPECTION_CONTEXT_COUNT = 3;
export const EXPANDED_INSPECTION_CONTEXT_COUNT = 10;

export const getRecentContext = <T>(items: T[], count: number): T[] =>
  items.slice(-count);

export const getMessageAgeLabel = (
  message: {
    id?: string;
    role: "user" | "assistant" | "system";
  },
  now = Date.now(),
): string => {
  const direction = message.role === "user" ? "Sent" : "Received";
  const timestamp = getTimestampFromMessageId(message.id);
  if (timestamp === undefined) return `${direction} time unknown`;

  return `${direction} ${formatElapsedTime(Math.max(0, now - timestamp))} ago`;
};

export const getTimestampFromMessageId = (
  messageId: string | undefined,
): number | undefined => {
  const timestamp = messageId?.match(/(?:^|-)(\d{13})(?:-|$)/)?.[1];
  if (!timestamp) return undefined;

  const parsed = Number(timestamp);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatElapsedTime = (elapsedMs: number): string => {
  const seconds = Math.floor(elapsedMs / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  return `${Math.floor(hours / 24)}d`;
};
