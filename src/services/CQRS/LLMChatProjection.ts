import type {
  ChatEvent,
  MessageCreatedEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  MessagesDeletedEvent,
  ChapterCreatedEvent,
  ChapterEditedEvent,
  ChapterDeletedEvent,
  StoryCreatedEvent,
  StoryEditedEvent,
  PlanCreatedEvent,
  PlanHiddenEvent,
  ChainOfThoughtStepCreatedEvent,
  ChainOfThoughtHiddenEvent,
} from "./events/ChatEvent";

import { createInstanceCache } from "../Utils/getOrCreateInstance";

export const getLLMChatProjectionInstance = createInstanceCache(
  (_chatId: string) => new LLMChatProjection(),
);

// ---- LLM Chat Projection ----
export class LLMChatProjection {
  private messages: MessageState[] = [];
  private numberOfPreviousChapterMessages: number = 6;

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
    this.applyEvent(event);
    this.notifySubscribers();
  }

  public processBatch(events: ChatEvent[]) {
    for (const event of events) {
      this.applyEvent(event);
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
      case "CivitJobCreated":
        break;
      case "PlanCreated":
        this.processPlanCreated(event);
        break;
      case "PlanHidden":
        this.processPlanHidden(event);
        break;
      case "ChainOfThoughtStepCreated":
        this.processChainOfThoughtStepCreated(event);
        break;
      case "ChainOfThoughtHidden":
        this.processChainOfThoughtHidden(event);
        break;
    }
  }

  // ---- LLM Message Retrieval ----
  public GetMessages(): LLMMessage[] {
    const lastChapter = this.getLastChapter();
    if (!lastChapter) return this.getVisibleMessages();

    const messagesSinceChapter = this.getMessagesSinceChapter(lastChapter);

    if (!this.shouldIncludePreviousChapterBuffer(messagesSinceChapter)) {
      return this.getVisibleMessagesWithBufferBeforeLastChapter(lastChapter);
    }

    return this.getVisibleMessages();
  }

  /**
   * Returns LLM context messages excluding plan messages for a specific plan definition.
   * Used during plan regeneration so the plan's own content isn't in the context
   * (it's provided separately in the prompt instead).
   */
  public GetMessagesExcludingPlan(planDefinitionId: string): LLMMessage[] {
    return this.GetMessages().filter((m) => {
      const state = this.getMessage(m.id ?? "");
      return !(
        state?.type === "plan" &&
        state.data?.planDefinitionId === planDefinitionId
      );
    });
  }

  /**
   * Returns LLM context messages excluding all plan messages.
   * Used when a plan has hideOtherPlans enabled to prevent model confusion.
   */
  public GetMessagesExcludingAllPlans(): LLMMessage[] {
    return this.GetMessages().filter((m) => {
      const state = this.getMessage(m.id ?? "");
      return state?.type !== "plan";
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
      this.createMessageState(event.storyId, "message", "system", storyContent),
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

    this.updateLastChapterFormat();
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

    const previousLastChapter = this.getLastChapter();
    if (!!previousLastChapter)
      this.updateChapterToSimpleFormat(previousLastChapter.id);

    const chapterContent = this.formatChapterContentFull(
      event.title,
      event.summary,
      event.nextChapterDirection,
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
      nextChapterDirection: event.nextChapterDirection,
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
    msg.type === "message";

  processChapterEdited(event: ChapterEditedEvent) {
    const chapter = this.getMessage(event.chapterId);
    if (!chapter || !chapter.coveredMessageIds) return;

    // Update metadata
    chapter.data = {
      title: event.title,
      summary: event.summary,
      nextChapterDirection: event.nextChapterDirection,
    };

    // Determine if this is the last chapter
    const isLastChapter = this.getLastChapter()?.id === event.chapterId;

    if (isLastChapter) {
      this.updateChapterToFullFormat(event.chapterId);
    } else {
      this.updateChapterToSimpleFormat(event.chapterId);
    }
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

  formatPlanContent = (planName: string, content: string): string =>
    `[Plan: ${planName}]\n${content}\n[End of Plan]`;

  /**
   * Adds a chain of thought step message to the LLM context.
   * Chain of thought messages are hidden by default (not shown to LLM)
   * as they are only used during the reasoning process.
   */
  processChainOfThoughtStepCreated(event: ChainOfThoughtStepCreatedEvent) {
    const formattedContent = this.formatChainOfThoughtStepContent(
      event.chainOfThoughtName,
      event.stepIndex,
      event.content,
    );
    const cotMessage = this.createMessageState(
      event.messageId,
      "chainOfThought",
      "system",
      formattedContent,
    );
    cotMessage.data = {
      chainOfThoughtId: event.chainOfThoughtId,
      chainOfThoughtName: event.chainOfThoughtName,
      stepIndex: event.stepIndex,
      stepPrompt: event.stepPrompt,
      rawContent: event.content,
    };
    // Chain of thought messages are hidden from LLM context by default
    cotMessage.hidden = true;
    this.messages.push(cotMessage);
  }

  /**
   * Hides all existing chain of thought messages for a definition.
   */
  processChainOfThoughtHidden(event: ChainOfThoughtHiddenEvent) {
    this.messages
      .filter(
        (m) =>
          m.type === "chainOfThought" &&
          m.data?.chainOfThoughtId === event.chainOfThoughtId,
      )
      .forEach((m) => {
        m.hidden = true;
      });
  }

  formatChainOfThoughtStepContent = (
    name: string,
    stepIndex: number,
    content: string,
  ): string =>
    `[Chain of Thought: ${name} - Step ${stepIndex + 1}]\n${content}\n[End of Step]`;

  // ---- Helpers ----
  formatStoryContent = (content: string): string => `# Story\r\n${content}`;

  getMessagesSinceChapter = (lastChapter: MessageState) =>
    this.getVisibleMessages().filter(
      (m) => this.getMessageIndex(m.id) > this.getMessageIndex(lastChapter.id),
    );

  getVisibleChapterMessages = (chapter: MessageState) => {
    if (!chapter.coveredMessageIds) return [];
    return chapter.coveredMessageIds
      .map((id) => this.getMessage(id))
      .filter((msg) => msg !== undefined && !msg.deleted) as MessageState[];
  };

  shouldIncludePreviousChapterBuffer = (messagesSinceChapter: MessageState[]) =>
    messagesSinceChapter.length >= this.numberOfPreviousChapterMessages;

  getMessage = (id: string): MessageState | undefined =>
    this.messages.find((m) => m.id === id);

  getMessageIndex = (id: string): number =>
    this.messages.findIndex((m) => m.id === id);

  getVisibleMessages = (): MessageState[] =>
    this.messages.filter(
      (m) => !m.hiddenByChapterId && !m.deleted && !m.hidden,
    );

  getVisibleMessagesWithBufferBeforeLastChapter(
    lastChapter: MessageState,
  ): MessageState[] {
    const visibleMessages = this.getVisibleMessages();
    const bufferMessages = this.getPreviousChapterBufferMessages(lastChapter);

    if (bufferMessages.length === 0) return visibleMessages;

    const lastChapterIndex = visibleMessages.findIndex(
      (m) => m.id === lastChapter.id,
    );

    if (lastChapterIndex === -1) return visibleMessages;

    // Insert buffer messages just before the last chapter
    return [
      ...visibleMessages.slice(0, lastChapterIndex),
      ...bufferMessages,
      ...visibleMessages.slice(lastChapterIndex),
    ];
  }

  getLastChapter(): MessageState | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const m = this.messages[i];
      if (m.type === "chapter") return m;
    }

    return null;
  }

  getPreviousChapterBufferMessages(lastChapter: MessageState): MessageState[] {
    if (!lastChapter.coveredMessageIds) return [];
    const bufferIds = lastChapter.coveredMessageIds.slice(
      -this.numberOfPreviousChapterMessages,
    );

    return bufferIds
      .map((id) => this.getMessage(id))
      .filter(Boolean) as MessageState[];
  }

  formatChapterContentSimple = (title?: string, summary?: string): string =>
    `[Previous Chapter Summary: ${title ?? ""}]\n${
      summary ?? ""
    }\n[End of Chapter Summary]`;

  formatChapterContentWithDirection = (
    title: string,
    summary: string,
    nextChapterDirection: string | undefined,
  ): string => {
    let content = `[Previous Chapter Summary: ${title}]\n${summary}\n[End of Chapter Summary]`;

    if (nextChapterDirection?.trim())
      content += `\n[Directions for continuing the story:]\n${nextChapterDirection}\n`;

    return content;
  };

  formatChapterContentFull = (
    title?: string,
    summary?: string,
    nextChapterDirection?: string,
  ): string => {
    let content = "";

    content += `[Previous Chapter Summary: ${title ?? ""}]\n${
      summary ?? ""
    }\n[End of Chapter Summary]`;

    if (nextChapterDirection?.trim())
      content += `\n[Directions for continuing the story:]\n${nextChapterDirection}\n`;

    return content;
  };

  getLastSixChapterMessages(coveredMessageIds: string[]): MessageState[] {
    const validMessages = coveredMessageIds
      .map((id) => this.getMessage(id))
      .filter((msg): msg is MessageState => msg !== undefined && !msg.deleted);

    return validMessages.slice(-6);
  }

  updateChapterToSimpleFormat(chapterId: string): void {
    const chapter = this.getMessage(chapterId);
    if (!chapter) return;

    const { title, summary } = chapter?.data || {};

    chapter.content = this.formatChapterContentSimple(title, summary);
  }

  updateChapterToFullFormat(chapterId: string): void {
    const chapter = this.getMessage(chapterId);
    if (!chapter) return;

    const { title, summary, nextChapterDirection } = chapter.data || {};
    chapter.content = this.formatChapterContentFull(
      title,
      summary,
      nextChapterDirection,
    );
  }

  updateLastChapterFormat(): void {
    const lastChapter = this.getLastChapter();
    if (!lastChapter?.data || !lastChapter.coveredMessageIds) return;

    const { title, summary, nextChapterDirection } = lastChapter.data;
    if (!title || !summary) return;

    // Count visible messages after the last chapter
    const chapterIndex = this.getMessageIndex(lastChapter.id);
    const messagesAfterChapter = this.getVisibleMessages().filter(
      (m) => this.getMessageIndex(m.id) > chapterIndex,
    );

    // If we have 6 or more messages after chapter, don't include covered messages
    // but still include the direction if it exists
    if (messagesAfterChapter.length >= this.numberOfPreviousChapterMessages) {
      const chapter = this.getMessage(lastChapter.id);
      if (chapter) {
        chapter.content = this.formatChapterContentWithDirection(
          title,
          summary,
          nextChapterDirection,
        );
      }
    } else {
      // Use full format with last 6 covered messages
      this.updateChapterToFullFormat(lastChapter.id);
    }
  }

  createMessageState(
    id: string,
    type: "message" | "chapter" | "plan" | "chainOfThought",
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
      deleted: false,
      hidden: false,
      coveredMessageIds,
    };
  }
}

// ---- Types ----
interface MessageState {
  id: string;
  type: "message" | "chapter" | "plan" | "chainOfThought";
  role: "user" | "assistant" | "system";
  content: string;
  hiddenByChapterId: string | null;
  deleted: boolean;
  /**
   * When true, the message is excluded from LLM context.
   * Used by plan messages: prior plan instances are hidden
   * when a new plan is generated for the same definition.
   * Chain of thought messages are always hidden from LLM context.
   */
  hidden: boolean;
  coveredMessageIds?: string[] | null;
  // Store chapter/plan/chain-of-thought metadata
  data?: {
    title?: string;
    summary?: string;
    nextChapterDirection?: string;
    planDefinitionId?: string;
    planName?: string;
    rawContent?: string;
    chainOfThoughtId?: string;
    chainOfThoughtName?: string;
    stepIndex?: number;
    stepPrompt?: string;
  };
}

export interface LLMMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
}
