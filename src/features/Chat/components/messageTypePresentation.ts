import { Theme } from "../../../components/Theme";
import type { UserChatMessage } from "../../../services/CQRS/UserChatProjection";

export type MessageType = UserChatMessage["type"] | string;

const presentations: Record<string, { label: string; color: string }> = {
  "user-message": {
    label: "User message",
    color: Theme.messages.user.background,
  },
  assistant: {
    label: "Assistant response",
    color: Theme.messages.assistant.background,
  },
  "system-message": {
    label: "System message",
    color: Theme.systemPrompts.primary,
  },
  reasoning: {
    label: "Reasoning",
    color: Theme.chatSettings.primary,
  },
  story: {
    label: "Story",
    color: Theme.memories.primary,
  },
  chapter: {
    label: "Chapter",
    color: Theme.chapter.primary,
  },
  book: {
    label: "Book",
    color: Theme.book.primary,
  },
  plan: {
    label: "Plan",
    color: Theme.plan.primary,
  },
  note: {
    label: "Note",
    color: Theme.note.primary,
  },
  "civit-workflow": {
    label: "Image workflow",
    color: Theme.imageModel.secondary,
  },
  "agent-clarification": {
    label: "Agent clarification",
    color: Theme.character.primary,
  },
};

export const getMessageTypePresentation = (
  type: MessageType | undefined,
  role?: "user" | "assistant" | "system",
): { label: string; color: string } => {
  const resolvedType = type ?? roleToMessageType(role);
  return (
    presentations[resolvedType] ?? {
      label: formatMessageType(resolvedType),
      color: "var(--mantine-color-gray-6)",
    }
  );
};

const roleToMessageType = (
  role: "user" | "assistant" | "system" | undefined,
): string => {
  if (role === "user") return "user-message";
  if (role === "assistant") return "assistant";
  return "system-message";
};

const formatMessageType = (type: string): string =>
  type
    .split("-")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
