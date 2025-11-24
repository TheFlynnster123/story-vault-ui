import type { ChatEvent } from "./events/ChatEvent";
import { d } from "../app/Dependencies/Dependencies";

// ---- Singleton ----
const chatEventServiceInstances = new Map<string, ChatEventService>();

export const getChatEventServiceInstance = (
  chatId: string | null
): ChatEventService | null => {
  if (!chatId) return null;

  if (!chatEventServiceInstances.has(chatId))
    chatEventServiceInstances.set(chatId, new ChatEventService(chatId));

  return chatEventServiceInstances.get(chatId)!;
};

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
    this.InitializePromise = this.doInitialize();
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

  initializeProjections(): void {
    if (!this.Events) return;

    for (const event of this.Events) {
      d.UserChatProjection(this.chatId).process(event);
      d.LLMChatProjection(this.chatId).process(event);
    }
  }
}
