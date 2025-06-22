import type { Message } from "../Chat/ChatMessage";

export interface ChatPage {
  chatId: string;
  pageId: string;
  messages: Message[];
}
