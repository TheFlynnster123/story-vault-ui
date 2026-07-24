import type { LLMMessage } from "../../../../services/CQRS/LLMChatProjection";

export type ContextSectionSource =
  | "earlier-history"
  | "memories"
  | "character-sheets"
  | "recent-history";

export interface ContextDocument {
  earlierHistory: LLMMessage[];
  memories: LLMMessage[];
  characterSheets: LLMMessage[];
  recentHistory: LLMMessage[];
}

export interface ContextSectionTrace {
  source: ContextSectionSource;
  messageCount: number;
  messageIds: string[];
}

interface CreateContextDocumentInput {
  projectedHistory: LLMMessage[];
  memoryMessages: LLMMessage[];
  characterSheetMessages: LLMMessage[];
  recentMessageCount: number;
}

export const createContextDocument = ({
  projectedHistory,
  memoryMessages,
  characterSheetMessages,
  recentMessageCount,
}: CreateContextDocumentInput): ContextDocument => {
  const splitIndex = Math.max(
    0,
    projectedHistory.length - normalizeMessageCount(recentMessageCount),
  );

  return {
    earlierHistory: projectedHistory.slice(0, splitIndex),
    memories: [...memoryMessages],
    characterSheets: [...characterSheetMessages],
    recentHistory: projectedHistory.slice(splitIndex),
  };
};

export const renderContextDocumentMessages = (
  document: ContextDocument,
): LLMMessage[] => [
  ...document.earlierHistory,
  ...document.memories,
  ...document.characterSheets,
  ...document.recentHistory,
];

export const renderConsolidatedReasoningContext = (
  document: ContextDocument,
  reasoningPrompt: string,
): string => {
  const sections = [
    `Chat History:\n\n${consolidateMessages(document.earlierHistory)}`,
  ];

  appendMessageSection(sections, "Memories", document.memories, "# Memories");
  appendMessageSection(
    sections,
    "Character Sheets",
    document.characterSheets,
    "# Character Sheets",
  );

  if (document.recentHistory.length > 0) {
    sections.push(
      `Recent Chat History:\n\n${consolidateMessages(document.recentHistory)}`,
    );
  }

  sections.push(`Reasoning Instructions:\n\n${reasoningPrompt}`);
  return sections.join("\n\n---\n\n");
};

export const traceContextDocument = (
  document: ContextDocument,
): ContextSectionTrace[] => [
  createTrace("earlier-history", document.earlierHistory),
  createTrace("memories", document.memories),
  createTrace("character-sheets", document.characterSheets),
  createTrace("recent-history", document.recentHistory),
];

const appendMessageSection = (
  sections: string[],
  heading: string,
  messages: LLMMessage[],
  messageHeading: string,
): void => {
  if (messages.length === 0) return;
  const content = messages
    .map((message) => removeLeadingHeading(message.content, messageHeading))
    .join("\n\n");
  sections.push(`${heading}:\n\n${content}`);
};

const removeLeadingHeading = (content: string, heading: string): string =>
  content.replace(new RegExp(`^${escapeRegExp(heading)}\\r?\\n`), "");

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const consolidateMessages = (messages: LLMMessage[]): string =>
  messages
    .map((message) => `${formatRole(message.role)}: ${message.content}`)
    .join("\n\n");

const formatRole = (role: LLMMessage["role"]): string => {
  if (role === "user") return "User";
  if (role === "assistant") return "Assistant";
  return "System";
};

const createTrace = (
  source: ContextSectionSource,
  messages: LLMMessage[],
): ContextSectionTrace => ({
  source,
  messageCount: messages.length,
  messageIds: messages.flatMap((message) =>
    message.id === undefined ? [] : [message.id],
  ),
});

const normalizeMessageCount = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
};
