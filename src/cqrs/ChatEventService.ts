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

  public Events: ChatEvent[] | undefined = undefined;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  // ---- Public Methods ----
  public async Initialize(): Promise<void> {
    if (this.Initialized) return;

    this.Initialized = true;
    this.Events = await d.ChatEventStore().getChatEvents(this.chatId);

    this.initializeProjections();
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
