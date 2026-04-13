import { MessageCreatedEventUtil as MessageCreatedEventUtil } from "./events/MessageCreatedEventUtil";
import { MessageEditedEventUtil } from "./events/MessageEditedEventUtil";
import { MessageDeletedEventUtil } from "./events/MessageDeletedEventUtil";
import {
  ChapterCreatedEventUtil,
  ChapterEditedEventUtil,
  ChapterDeletedEventUtil,
} from "./events/ChapterEventUtils";
import {
  BookCreatedEventUtil,
  BookEditedEventUtil,
  BookDeletedEventUtil,
} from "./events/BookEventUtils";
import { CivitJobCreatedEventUtil } from "./events/CivitJobCreatedEventUtil";
import { MessagesDeletedEventUtil } from "./events/MessagesDeletedEventUtil";
import { StoryCreatedEventUtil } from "./events/StoryCreatedEventUtil";
import { StoryEditedEventUtil } from "./events/StoryEditedEventUtil";
import {
  PlanCreatedEventUtil,
  PlanHiddenEventUtil,
} from "./events/PlanEventUtils";
import {
  NoteCreatedEventUtil,
  NoteEditedEventUtil,
} from "./events/NoteEventUtils";
import { d } from "../Dependencies";

export class ChatService {
  chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  // ---- Story Operations ----
  public async InitializeStory(content: string): Promise<void> {
    const event = StoryCreatedEventUtil.Create(content);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  public async EditStory(storyId: string, content: string): Promise<void> {
    const event = StoryEditedEventUtil.Create(storyId, content);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  // ---- Message Operations ----
  public async AddUserMessage(message: string): Promise<void> {
    const event = MessageCreatedEventUtil.Create("user", message);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  public async AddSystemMessage(message: string): Promise<void> {
    const event = MessageCreatedEventUtil.Create("system", message);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  public async AddAssistantMessage(message: string): Promise<void> {
    const event = MessageCreatedEventUtil.Create("assistant", message);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  public async CreateCivitJob(jobId: string, prompt: string): Promise<void> {
    const event = CivitJobCreatedEventUtil.Create(jobId, prompt);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  public async EditMessage(
    messageId: string,
    newContent: string,
  ): Promise<void> {
    const event = MessageEditedEventUtil.Create(messageId, newContent);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  public async DeleteMessage(messageId: string): Promise<void> {
    const event = MessageDeletedEventUtil.Create(messageId);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  public async DeleteMessageAndAllBelow(messageId: string): Promise<void> {
    const allMessages = d.UserChatProjection(this.chatId).GetMessages();
    const messageIndex = allMessages.findIndex((m) => m.id === messageId);
    const messageIdsToDelete = allMessages.slice(messageIndex).map((m) => m.id);

    const event = MessagesDeletedEventUtil.Create(messageIdsToDelete);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  // ---- Chapter Operations ----
  public async AddChapter(
    title: string,
    summary: string,
    nextChapterDirection?: string,
  ): Promise<void> {
    const allMessages = d.UserChatProjection(this.chatId).GetMessages();
    const coveredMessageIds = allMessages
      .filter((m) => m.type !== "chapter" && m.type !== "story" && !m.deleted)
      .map((m) => m.id);

    const event = ChapterCreatedEventUtil.Create(
      title,
      summary,
      coveredMessageIds,
      nextChapterDirection,
    );

    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  public async EditChapter(
    chapterId: string,
    title: string,
    summary: string,
    nextChapterDirection?: string,
  ): Promise<void> {
    const event = ChapterEditedEventUtil.Create(
      chapterId,
      title,
      summary,
      nextChapterDirection,
    );
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  public async DeleteChapter(chapterId: string): Promise<void> {
    const event = ChapterDeletedEventUtil.Create(chapterId);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  // ---- Book Operations ----
  public async AddBook(
    title: string,
    summary: string,
    coveredChapterIds: string[],
  ): Promise<void> {
    const event = BookCreatedEventUtil.Create(title, summary, coveredChapterIds);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  public async EditBook(
    bookId: string,
    title: string,
    summary: string,
  ): Promise<void> {
    const event = BookEditedEventUtil.Create(bookId, title, summary);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  public async DeleteBook(bookId: string): Promise<void> {
    const event = BookDeletedEventUtil.Create(bookId);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  // ---- Plan Operations ----

  /**
   * Hides all prior plan messages for this definition, then creates a new plan message.
   * This ensures only the latest plan instance is visible in the timeline.
   */
  public async AddPlanMessage(
    planDefinitionId: string,
    planName: string,
    content: string,
  ): Promise<void> {
    const hideEvent = PlanHiddenEventUtil.Create(planDefinitionId);
    const createEvent = PlanCreatedEventUtil.Create(
      planDefinitionId,
      planName,
      content,
    );
    await d.ChatEventService(this.chatId).AddChatEvents([hideEvent, createEvent]);
  }

  // ---- Note Operations ----

  public async AddNote(
    content: string,
    expiresAfterMessages: number | null,
  ): Promise<void> {
    const event = NoteCreatedEventUtil.Create(content, expiresAfterMessages);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  public async EditNote(
    noteId: string,
    content: string,
    expiresAfterMessages: number | null,
  ): Promise<void> {
    const event = NoteEditedEventUtil.Create(
      noteId,
      content,
      expiresAfterMessages,
    );
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }
}
