import type {
  ChatEvent,
  MessageCreatedEvent,
  ReasoningCreatedEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  MessagesDeletedEvent,
  ChapterCreatedEvent,
  ChapterEditedEvent,
  ChapterDeletedEvent,
  BookCreatedEvent,
  BookEditedEvent,
  BookDeletedEvent,
  StoryCreatedEvent,
  StoryEditedEvent,
  PlanCreatedEvent,
  PlanHiddenEvent,
  NoteCreatedEvent,
  NoteEditedEvent,
  AgentClarificationCreatedEvent,
} from "./events/ChatEvent";
import { normalizeChatEvent } from "./events/normalizeChatEvent";

import { createInstanceCache } from "../Utils/getOrCreateInstance";

export const getLLMChatProjectionInstance = createInstanceCache(
  () => new LLMChatProjection(),
);

export interface LLMContextProjectionPolicy {
  trailingChapterMessages?: number;
  reasoningRetentionMessages?: number | null;
  planSelection?: PlanContextSelection;
}

export type PlanContextSelection =
  | { mode: "include" }
  | { mode: "exclude-all" }
  | { mode: "exclude-definition"; planDefinitionId: string };

export type LLMContextExclusionReason =
  | "deleted"
  | "hidden"
  | "chapter-compressed"
  | "book-compressed"
  | "expired-note"
  | "expired-reasoning"
  | "plan-filtered";

export interface LLMContextProjectionTraceEntry {
  id: string;
  type: LLMContextItemType;
  included: boolean;
  buffered: boolean;
  exclusionReason?: LLMContextExclusionReason;
}

export interface LLMContextProjectionResult {
  messages: LLMMessage[];
  trace: LLMContextProjectionTraceEntry[];
}

export const DEFAULT_LLM_CONTEXT_PROJECTION_POLICY = {
  trailingChapterMessages: 6,
  reasoningRetentionMessages: null,
  planSelection: { mode: "include" },
} as const satisfies Required<LLMContextProjectionPolicy>;

// ---- LLM Chat Projection ----
export class LLMChatProjection {
  private messages: MessageState[] = [];

  private subscribers = new Set<() => void>();

  constructor() {
    this.messages = [];
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  // ---- Event Processing ----
  public process(event: ChatEvent) {
    this.applyEvent(normalizeChatEvent(event));
    this.notifySubscribers();
  }

  public processBatch(events: ChatEvent[]) {
    for (const event of events) {
      this.applyEvent(normalizeChatEvent(event));
    }
    this.notifySubscribers();
  }

  private applyEvent(event: ChatEvent) {
    switch (event.type) {
      case "StoryCreated":
        this.processStoryCreated(event);
        break;
      case "StoryEdited":
        this.processStoryEdited(event);
        break;
      case "MessageCreated":
        this.processMessageCreated(event);
        break;
      case "ReasoningCreated":
        this.processReasoningCreated(event);
        break;
      case "MessageEdited":
        this.processMessageEdited(event);
        break;
      case "MessageDeleted":
        this.processMessageDeleted(event);
        break;
      case "MessagesDeleted":
        this.processMessagesDeleted(event);
        break;
      case "ChapterCreated":
        this.processChapterCreated(event);
        break;
      case "ChapterEdited":
        this.processChapterEdited(event);
        break;
      case "ChapterDeleted":
        this.processChapterDeleted(event);
        break;
      case "BookCreated":
        this.processBookCreated(event);
        break;
      case "BookEdited":
        this.processBookEdited(event);
        break;
      case "BookDeleted":
        this.processBookDeleted(event);
        break;
      case "CivitWorkflowCreated":
        break;
      case "CivitWorkflowUpdated":
        break;
      case "PlanCreated":
        this.processPlanCreated(event);
        break;
      case "PlanHidden":
        this.processPlanHidden(event);
        break;
      case "NoteCreated":
        this.processNoteCreated(event);
        break;
      case "NoteEdited":
        this.processNoteEdited(event);
        break;
      case "AgentClarificationCreated":
        this.processAgentClarificationCreated(event);
        break;
    }
  }

  // ---- LLM Message Retrieval ----
  public GetMessages(policy: LLMContextProjectionPolicy = {}): LLMMessage[] {
    return this.GetContext(policy).messages;
  }

  public GetContext(
    policy: LLMContextProjectionPolicy = {},
  ): LLMContextProjectionResult {
    const resolvedPolicy = resolveProjectionPolicy(policy);
    const visibleMessages = this.getVisibleMessages();
    const bufferedMessages = this.addLatestChapterBuffer(
      visibleMessages,
      resolvedPolicy.trailingChapterMessages,
    );
    const messagesWithActiveNotes = this.excludeExpiredNotes(bufferedMessages);

    const messagesWithRetainedReasoning = filterReasoningMessagesByRetention(
      messagesWithActiveNotes,
      resolvedPolicy.reasoningRetentionMessages,
    );
    const selectedMessages = filterPlans(
      messagesWithRetainedReasoning,
      resolvedPolicy.planSelection,
    );

    return {
      messages: selectedMessages,
      trace: this.createProjectionTrace({
        visibleMessages,
        bufferedMessages,
        messagesWithActiveNotes,
        messagesWithRetainedReasoning,
        selectedMessages,
      }),
    };
  }

  /**
   * Returns LLM context messages excluding plan messages for a specific plan definition.
   * Used during plan regeneration so the plan's own content isn't in the context
   * (it's provided separately in the prompt instead).
   */
  public GetMessagesExcludingPlan(
    planDefinitionId: string,
    policy: LLMContextProjectionPolicy = {},
  ): LLMMessage[] {
    return this.GetMessages({
      ...policy,
      planSelection: {
        mode: "exclude-definition",
        planDefinitionId,
      },
    });
  }

  /**
   * Returns LLM context messages excluding all plan messages.
   * Used when a plan has hideOtherPlans enabled to prevent model confusion.
   */
  public GetMessagesExcludingAllPlans(
    policy: LLMContextProjectionPolicy = {},
  ): LLMMessage[] {
    return this.GetMessages({
      ...policy,
      planSelection: { mode: "exclude-all" },
    });
  }

  public GetMessage(id: string): LLMMessage | null {
    const msg = this.getMessage(id);

    if (!msg || msg.deleted) return null;
    return msg;
  }

  // ---- Event Handlers ----
  processStoryCreated(event: StoryCreatedEvent) {
    const storyContent = this.formatStoryContent(event.content);
    this.messages.unshift(
      this.createMessageState(event.storyId, "story", "system", storyContent),
    );
  }

  processStoryEdited(event: StoryEditedEvent) {
    const story = this.getMessage(event.storyId);
    if (story && !story.deleted) {
      story.content = this.formatStoryContent(event.content);
    }
  }

  processMessageCreated(event: MessageCreatedEvent) {
    this.messages.push(
      this.createMessageState(
        event.messageId,
        "message",
        event.role,
        event.content,
      ),
    );
  }

  processReasoningCreated(event: ReasoningCreatedEvent) {
    this.messages.push(
      this.createMessageState(
        event.messageId,
        "reasoning",
        "assistant",
        this.formatReasoningContent(event.content),
      ),
    );
  }

  processMessageEdited(event: MessageEditedEvent) {
    const msg = this.getMessage(event.messageId);
    if (msg && !msg.deleted) msg.content = event.newContent;
  }

  processMessageDeleted(event: MessageDeletedEvent) {
    const msg = this.getMessage(event.messageId);
    if (msg) msg.deleted = true;
  }

  processMessagesDeleted(event: MessagesDeletedEvent) {
    event.messageIds.forEach((id) => {
      const msg = this.getMessage(id);
      if (msg) msg.deleted = true;
    });
  }

  processChapterCreated(event: ChapterCreatedEvent) {
    this.hideMessages(event.chapterId, event.coveredMessageIds);

    const chapterContent = this.formatChapterContent(
      event.title,
      event.summary,
    );

    const chapterMessage = this.createMessageState(
      event.chapterId,
      "chapter",
      "system",
      chapterContent,
      event.coveredMessageIds,
    );

    // Store metadata for future format updates
    chapterMessage.data = {
      title: event.title,
      summary: event.summary,
    };

    this.messages.push(chapterMessage);
  }

  hideMessages(chapterId: string, messageIds: string[]) {
    messageIds.forEach((id) => {
      const msg = this.getMessage(id);
      if (msg && this.isHideableByChapter(msg))
        msg.hiddenByChapterId = chapterId;
    });
  }

  private isHideableByChapter = (msg: MessageState): boolean =>
    msg.type === "message" || msg.type === "reasoning";

  processChapterEdited(event: ChapterEditedEvent) {
    const chapter = this.getMessage(event.chapterId);
    if (!chapter || !chapter.coveredMessageIds) return;

    chapter.data = {
      title: event.title,
      summary: event.summary,
    };
    chapter.content = this.formatChapterContent(event.title, event.summary);
  }

  processChapterDeleted(event: ChapterDeletedEvent) {
    const chapter = this.getMessage(event.chapterId);
    if (!chapter) return;

    chapter.coveredMessageIds?.forEach((id) => {
      const msg = this.getMessage(id);
      if (msg) msg.hiddenByChapterId = null;
    });

    chapter.deleted = true;
  }

  /**
   * Creates a book that summarizes contiguous chapters.
   * Hides covered chapters and inserts the book summary at the position
   * of the first covered chapter so the history reads chronologically.
   */
  processBookCreated(event: BookCreatedEvent) {
    const firstChapterIndex = this.findFirstCoveredChapterIndex(
      event.coveredChapterIds,
    );

    event.coveredChapterIds.forEach((id) => {
      const msg = this.getMessage(id);
      if (msg && msg.type === "chapter") msg.hiddenByBookId = event.bookId;
    });

    const bookContent = this.formatBookContent(event.title, event.summary);
    const bookMessage = this.createMessageState(
      event.bookId,
      "book",
      "system",
      bookContent,
    );
    bookMessage.data = {
      title: event.title,
      summary: event.summary,
    };

    if (firstChapterIndex !== -1) {
      this.messages.splice(firstChapterIndex, 0, bookMessage);
    } else {
      this.messages.push(bookMessage);
    }
  }

  private findFirstCoveredChapterIndex(coveredChapterIds: string[]): number {
    return this.messages.findIndex(
      (m) => coveredChapterIds.includes(m.id) && m.type === "chapter",
    );
  }

  processBookEdited(event: BookEditedEvent) {
    const book = this.getMessage(event.bookId);
    if (!book) return;

    book.data = {
      ...book.data,
      title: event.title,
      summary: event.summary,
    };
    book.content = this.formatBookContent(event.title, event.summary);
  }

  processBookDeleted(event: BookDeletedEvent) {
    const book = this.getMessage(event.bookId);
    if (!book) return;

    this.messages
      .filter((m) => m.type === "chapter" && m.hiddenByBookId === event.bookId)
      .forEach((m) => {
        m.hiddenByBookId = null;
      });

    book.deleted = true;
  }

  /**
   * Adds a plan message to the LLM context with formatted markers.
   * Format: [Plan: Name]\n{content}\n[End of Plan]
   * This ensures the LLM recognizes plan content as distinct from conversation.
   */
  processPlanCreated(event: PlanCreatedEvent) {
    const formattedContent = this.formatPlanContent(
      event.planName,
      event.content,
    );
    const planMessage = this.createMessageState(
      event.messageId,
      "plan",
      "system",
      formattedContent,
    );
    planMessage.data = {
      planDefinitionId: event.planDefinitionId,
      planName: event.planName,
      rawContent: event.content,
    };
    this.messages.push(planMessage);
  }

  /**
   * Hides all existing plan messages for a plan definition.
   * When a new plan is generated, prior instances become invisible
   * to the LLM so it only sees the latest plan state.
   */
  processPlanHidden(event: PlanHiddenEvent) {
    this.messages
      .filter(
        (m) =>
          m.type === "plan" &&
          m.data?.planDefinitionId === event.planDefinitionId,
      )
      .forEach((m) => {
        m.hidden = true;
      });
  }

  /**
   * Adds a note message to the LLM context with formatted markers.
   * Format: [Note]\n{content}\n[End of Note]
   * Notes relay persistent user feedback to the LLM.
   */
  processNoteCreated(event: NoteCreatedEvent) {
    const formattedContent = this.formatNoteContent(event.content);
    const noteMessage = this.createMessageState(
      event.noteId,
      "note",
      "system",
      formattedContent,
    );
    noteMessage.data = {
      expiresAfterMessages: event.expiresAfterMessages,
      rawContent: event.content,
    };
    this.messages.push(noteMessage);
  }

  /**
   * Edits an existing note's content and/or expiration in the LLM context.
   */
  processNoteEdited(event: NoteEditedEvent) {
    const note = this.getMessage(event.noteId);
    if (!note) return;

    note.data = {
      ...note.data,
      expiresAfterMessages: event.expiresAfterMessages,
      rawContent: event.content,
    };
    note.content = this.formatNoteContent(event.content);
  }

  formatNoteContent = (content: string): string =>
    `[Note]\n${content}\n[End of Note]`;

  processAgentClarificationCreated(event: AgentClarificationCreatedEvent) {
    const clarificationMessage = this.createMessageState(
      event.clarificationId,
      "agent-clarification",
      "system",
      this.formatAgentClarificationContent(event.question, event.answer),
    );
    clarificationMessage.data = {
      question: event.question,
      answer: event.answer,
    };
    this.messages.push(clarificationMessage);
  }

  formatAgentClarificationContent = (
    question: string,
    answer: string,
  ): string =>
    `[User Clarification]\nQuestion: ${question}\nAnswer: ${answer}\n[End of User Clarification]`;

  formatPlanContent = (planName: string, content: string): string =>
    `[Plan: ${planName}]\n${content}\n[End of Plan]`;

  formatReasoningContent = (content: string): string =>
    `[Reasoning]\n${content}\n[End of Reasoning]`;

  formatBookContent = (title: string, summary: string): string =>
    `[Book Summary: ${title}]\n${summary}\n[End of Book Summary]`;

  // ---- Helpers ----
  formatStoryContent = (content: string): string => `# Story\r\n${content}`;

  private excludeExpiredNotes(messages: MessageState[]): MessageState[] {
    const regularMessagesAfter = this.countRegularMessagesAfterEachItem();

    return messages.filter((msg) => {
      if (msg.type !== "note") return true;
      if (
        msg.data?.expiresAfterMessages === null ||
        msg.data?.expiresAfterMessages === undefined
      )
        return true;

      return (
        (regularMessagesAfter.get(msg.id) ?? 0) <
        msg.data.expiresAfterMessages
      );
    });
  }

  private countRegularMessagesAfterEachItem(): Map<string, number> {
    const counts = new Map<string, number>();
    let regularMessagesAfter = 0;

    for (let index = this.messages.length - 1; index >= 0; index--) {
      const message = this.messages[index];
      counts.set(message.id, regularMessagesAfter);
      if (!message.deleted && message.type === "message") {
        regularMessagesAfter++;
      }
    }

    return counts;
  }

  getMessage = (id: string): MessageState | undefined =>
    this.messages.find((m) => m.id === id);

  getVisibleMessages = (): MessageState[] =>
    this.messages.filter(
      (m) =>
        !m.hiddenByChapterId && !m.hiddenByBookId && !m.deleted && !m.hidden,
    );

  private addLatestChapterBuffer(
    visibleMessages: MessageState[],
    bufferSize: number,
  ): MessageState[] {
    if (bufferSize === 0) return visibleMessages;

    const chapterIndex = findLastIndex(
      visibleMessages,
      (message) => message.type === "chapter",
    );
    if (chapterIndex === -1) return visibleMessages;

    const visibleItemsAfterChapter =
      visibleMessages.length - chapterIndex - 1;
    if (visibleItemsAfterChapter >= bufferSize) return visibleMessages;

    const latestChapter = visibleMessages[chapterIndex];
    const visibleIds = new Set(visibleMessages.map((message) => message.id));
    const bufferMessages = (latestChapter.coveredMessageIds ?? [])
      .map((id) => this.getMessage(id))
      .filter(
        (message): message is MessageState =>
          message !== undefined &&
          !message.deleted &&
          message.hiddenByChapterId === latestChapter.id &&
          this.isHideableByChapter(message) &&
          !visibleIds.has(message.id),
      )
      .slice(-bufferSize);

    return [
      ...visibleMessages.slice(0, chapterIndex),
      ...bufferMessages,
      ...visibleMessages.slice(chapterIndex),
    ];
  }

  private createProjectionTrace(stages: {
    visibleMessages: MessageState[];
    bufferedMessages: MessageState[];
    messagesWithActiveNotes: MessageState[];
    messagesWithRetainedReasoning: MessageState[];
    selectedMessages: MessageState[];
  }): LLMContextProjectionTraceEntry[] {
    const visibleIds = createIdSet(stages.visibleMessages);
    const bufferedIds = createIdSet(stages.bufferedMessages);
    const activeNoteIds = createIdSet(stages.messagesWithActiveNotes);
    const retainedReasoningIds = createIdSet(
      stages.messagesWithRetainedReasoning,
    );
    const selectedIds = createIdSet(stages.selectedMessages);

    return this.messages.map((message) => {
      const included = selectedIds.has(message.id);
      return {
        id: message.id,
        type: message.type,
        included,
        buffered: included && !visibleIds.has(message.id),
        exclusionReason: included
          ? undefined
          : this.getExclusionReason(
              message,
              bufferedIds,
              activeNoteIds,
              retainedReasoningIds,
            ),
      };
    });
  }

  private getExclusionReason(
    message: MessageState,
    bufferedIds: Set<string>,
    activeNoteIds: Set<string>,
    retainedReasoningIds: Set<string>,
  ): LLMContextExclusionReason {
    if (message.deleted) return "deleted";
    if (message.hidden) return "hidden";
    if (message.hiddenByBookId) return "book-compressed";
    if (message.hiddenByChapterId && !bufferedIds.has(message.id)) {
      return "chapter-compressed";
    }
    if (message.type === "note" && !activeNoteIds.has(message.id)) {
      return "expired-note";
    }
    if (
      message.type === "reasoning" &&
      !retainedReasoningIds.has(message.id)
    ) {
      return "expired-reasoning";
    }
    return "plan-filtered";
  }

  formatChapterContent = (title?: string, summary?: string): string =>
    `[Previous Chapter Summary: ${title ?? ""}]\n${
      summary ?? ""
    }\n[End of Chapter Summary]`;

  createMessageState(
    id: string,
    type: LLMContextItemType,
    role: "user" | "assistant" | "system",
    content: string,
    coveredMessageIds?: string[],
  ): MessageState {
    return {
      id,
      type,
      role,
      content,
      hiddenByChapterId: null,
      hiddenByBookId: null,
      deleted: false,
      hidden: false,
      coveredMessageIds,
    };
  }
}

// ---- Types ----
export type LLMContextItemType =
  | "story"
  | "message"
  | "chapter"
  | "book"
  | "plan"
  | "reasoning"
  | "note"
  | "agent-clarification";

interface MessageState {
  id: string;
  type: LLMContextItemType;
  role: "user" | "assistant" | "system";
  content: string;
  hiddenByChapterId: string | null;
  /** When set, the chapter is hidden because it's covered by a book */
  hiddenByBookId?: string | null;
  deleted: boolean;
  /**
   * When true, the message is excluded from LLM context.
   * Used by plan messages: prior plan instances are hidden
   * when a new plan is generated for the same definition.
   */
  hidden: boolean;
  coveredMessageIds?: string[] | null;
  // Store chapter/plan/book/note metadata
  data?: {
    title?: string;
    summary?: string;
    planDefinitionId?: string;
    planName?: string;
    rawContent?: string;
    expiresAfterMessages?: number | null;
    question?: string;
    answer?: string;
  };
}

export interface LLMMessage {
  id?: string;
  type?: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export const filterReasoningMessagesByRetention = <T extends LLMMessage>(
  messages: T[],
  retention: number | null,
): T[] => {
  if (retention === null) return messages;

  const retainedMessages: T[] = [];
  let regularMessagesAfter = 0;

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    const shouldRetain =
      message.type !== "reasoning" ||
      (retention > 0 && regularMessagesAfter < retention);

    if (shouldRetain) retainedMessages.push(message);
    if (message.type === "message") regularMessagesAfter++;
  }

  return retainedMessages.reverse();
};

const resolveProjectionPolicy = (
  policy: LLMContextProjectionPolicy,
): Required<LLMContextProjectionPolicy> => ({
  trailingChapterMessages: normalizeNonNegativeInteger(
    policy.trailingChapterMessages,
    DEFAULT_LLM_CONTEXT_PROJECTION_POLICY.trailingChapterMessages,
  ),
  reasoningRetentionMessages:
    policy.reasoningRetentionMessages === null
      ? null
      : normalizeNonNegativeInteger(
          policy.reasoningRetentionMessages,
          DEFAULT_LLM_CONTEXT_PROJECTION_POLICY.reasoningRetentionMessages,
        ),
  planSelection:
    policy.planSelection ??
    DEFAULT_LLM_CONTEXT_PROJECTION_POLICY.planSelection,
});

const normalizeNonNegativeInteger = <T extends number | null>(
  value: number | undefined,
  fallback: T,
): number | T => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value!));
};

const findLastIndex = <T>(
  values: T[],
  predicate: (value: T) => boolean,
): number => {
  for (let index = values.length - 1; index >= 0; index--) {
    if (predicate(values[index])) return index;
  }
  return -1;
};

const filterPlans = <T extends MessageState>(
  messages: T[],
  selection: PlanContextSelection,
): T[] => {
  if (selection.mode === "include") return messages;
  if (selection.mode === "exclude-all") {
    return messages.filter((message) => message.type !== "plan");
  }
  return messages.filter(
    (message) =>
      message.type !== "plan" ||
      message.data?.planDefinitionId !== selection.planDefinitionId,
  );
};

const createIdSet = (messages: MessageState[]): Set<string> =>
  new Set(messages.map((message) => message.id));
