import type { LLMMessage } from "../../../../services/CQRS/LLMChatProjection";
import type { SelectedContinuityHistory } from "../../../Histories/services/ContinuityHistoryContextService";

export type ContextSectionSource =
  | "earlier-history"
  | "memories"
  | "character-sheets"
  | "continuity-histories"
  | "recent-history";

export interface ContextDocument {
  earlierHistory: LLMMessage[];
  memories: LLMMessage[];
  characterSheets: LLMMessage[];
  continuityHistories: LLMMessage[];
  recentHistory: LLMMessage[];
  continuityHistoryRecentMessageCount: number;
  selectedContinuityHistories: SelectedContinuityHistory[];
}

export interface ContextSectionTrace {
  source: ContextSectionSource;
  messageCount: number;
  messageIds: string[];
  itemIds?: string[];
  selections?: SelectedContinuityHistory[];
}

interface CreateContextDocumentInput {
  projectedHistory: LLMMessage[];
  memoryMessages: LLMMessage[];
  characterSheetMessages: LLMMessage[];
  continuityHistoryMessages?: LLMMessage[];
  selectedContinuityHistories?: SelectedContinuityHistory[];
  recentMessageCount: number;
  continuityHistoryRecentMessageCount?: number;
}

export const createContextDocument = ({
  projectedHistory,
  memoryMessages,
  characterSheetMessages,
  continuityHistoryMessages = [],
  selectedContinuityHistories = [],
  recentMessageCount,
  continuityHistoryRecentMessageCount = recentMessageCount,
}: CreateContextDocumentInput): ContextDocument => {
  const splitIndex = Math.max(
    0,
    projectedHistory.length - normalizeMessageCount(recentMessageCount),
  );

  return {
    earlierHistory: projectedHistory.slice(0, splitIndex),
    memories: [...memoryMessages],
    characterSheets: [...characterSheetMessages],
    continuityHistories: [...continuityHistoryMessages],
    recentHistory: projectedHistory.slice(splitIndex),
    continuityHistoryRecentMessageCount: normalizeMessageCount(
      continuityHistoryRecentMessageCount,
    ),
    selectedContinuityHistories: [...selectedContinuityHistories],
  };
};

export const renderContextDocumentMessages = (
  document: ContextDocument,
): LLMMessage[] => {
  if (document.continuityHistories.length === 0) {
    return [
      ...document.earlierHistory,
      ...document.memories,
      ...document.characterSheets,
      ...document.recentHistory,
    ];
  }

  const projectedHistory = [
    ...document.earlierHistory,
    ...document.recentHistory,
  ];
  const characterInsertionIndex = document.earlierHistory.length;
  const continuityInsertionIndex = Math.max(
    0,
    projectedHistory.length - document.continuityHistoryRecentMessageCount,
  );
  const insertions = [
    {
      index: characterInsertionIndex,
      order: 0,
      messages: document.memories,
    },
    {
      index: characterInsertionIndex,
      order: 1,
      messages: document.characterSheets,
    },
    {
      index: continuityInsertionIndex,
      order: 2,
      messages: document.continuityHistories,
    },
  ].sort(
    (left, right) => left.index - right.index || left.order - right.order,
  );

  const rendered: LLMMessage[] = [];
  for (let index = 0; index <= projectedHistory.length; index++) {
    for (const insertion of insertions) {
      if (insertion.index === index) rendered.push(...insertion.messages);
    }
    if (index < projectedHistory.length) {
      rendered.push(projectedHistory[index]);
    }
  }
  return rendered;
};

export const renderConsolidatedReasoningContext = (
  document: ContextDocument,
  reasoningPrompt: string,
): string => {
  if (document.continuityHistories.length > 0) {
    return [
      `Chat Context:\n\n${consolidateMessages(
        renderContextDocumentMessages(document),
      )}`,
      `Reasoning Instructions:\n\n${reasoningPrompt}`,
    ].join("\n\n---\n\n");
  }

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
  {
    ...createTrace("continuity-histories", document.continuityHistories),
    itemIds: document.selectedContinuityHistories.map(
      (selection) => selection.historyId,
    ),
    selections: [...document.selectedContinuityHistories],
  },
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
