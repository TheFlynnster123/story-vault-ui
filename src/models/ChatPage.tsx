import type { Message } from "../pages/Chat/ChatMessage";

export interface ChatPage {
  chatId: string;
  pageId: string;
  messages: Message[];
}
