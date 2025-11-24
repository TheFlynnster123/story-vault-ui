import { d } from "../app/Dependencies/Dependencies";
import { MessageCreatedEventUtil as MessageCreatedEventUtil } from "./events/MessageCreatedEventUtil";
import { MessageEditedEventUtil } from "./events/MessageEditedEventUtil";
import { MessageDeletedEventUtil } from "./events/MessageDeletedEventUtil";
import {
  ChapterCreatedEventUtil,
  ChapterEditedEventUtil,
  ChapterDeletedEventUtil,
} from "./events/ChapterEventUtils";
import { CivitJobCreatedEventUtil } from "./events/CivitJobCreatedEventUtil";
import { MessagesDeletedEventUtil } from "./events/MessagesDeletedEventUtil";

export class ChatService {
  chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
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
    newContent: string
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
  public async AddChapter(title: string, summary: string): Promise<void> {
    const allMessages = d.UserChatProjection(this.chatId).GetMessages();
    const coveredMessageIds = allMessages
      .filter((m) => m.type !== "chapter" && !m.deleted)
      .map((m) => m.id);

    const event = ChapterCreatedEventUtil.Create(
      title,
      summary,
      coveredMessageIds
    );

    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  public async EditChapter(
    chapterId: string,
    title: string,
    summary: string
  ): Promise<void> {
    const event = ChapterEditedEventUtil.Create(chapterId, title, summary);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }

  public async DeleteChapter(chapterId: string): Promise<void> {
    const event = ChapterDeletedEventUtil.Create(chapterId);
    await d.ChatEventService(this.chatId).AddChatEvent(event);
  }
}
