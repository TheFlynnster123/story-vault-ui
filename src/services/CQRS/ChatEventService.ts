import type { ChatEvent } from "./events/ChatEvent";
import { d } from "../Dependencies";

import { createInstanceCache } from "../Utils/getOrCreateInstance";

export const getChatEventServiceInstance = createInstanceCache(
  (chatId: string) => new ChatEventService(chatId),
);

export class ChatEventService {
  private chatId: string;
  private Initialized: boolean = false;
  private InitializePromise: Promise<void> | null = null;

  public Events: ChatEvent[] | undefined = undefined;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  // ---- Public Methods ----
  public async Initialize(): Promise<void> {
    // Return existing initialization promise if already in progress
    if (this.InitializePromise) return this.InitializePromise;

    if (this.Initialized) return;

    // Store the promise to prevent race conditions
    this.InitializePromise = this.doInitialize().catch((error) => {
      // Clear the cached promise so initialization can be retried
      this.InitializePromise = null;
      throw error;
    });
    await this.InitializePromise;
  }

  private async doInitialize(): Promise<void> {
    this.Events = await d.ChatEventStore().getChatEvents(this.chatId);
    this.initializeProjections();
    this.Initialized = true;
  }

  public async AddChatEvent(chatEvent: ChatEvent): Promise<void> {
    if (!this.Initialized) await this.Initialize();

    d.UserChatProjection(this.chatId).process(chatEvent);
    d.LLMChatProjection(this.chatId).process(chatEvent);

    await d.ChatEventStore().addChatEvent(this.chatId, chatEvent);
  }

  public async AddChatEvents(chatEvents: ChatEvent[]): Promise<void> {
    if (!this.Initialized) await this.Initialize();

    d.UserChatProjection(this.chatId).processBatch(chatEvents);
    d.LLMChatProjection(this.chatId).processBatch(chatEvents);

    await d.ChatEventStore().addChatEvents(this.chatId, chatEvents);
  }

  initializeProjections(): void {
    if (!this.Events) return;

    d.UserChatProjection(this.chatId).processBatch(this.Events);
    d.LLMChatProjection(this.chatId).processBatch(this.Events);
  }
}
