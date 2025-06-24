import type { Message } from "../Chat/ChatMessage";
import type { ChatPage } from "../models/ChatPage";

export class ChatPageManager {
  MAX_MESSAGES_PER_PAGE = 10;

  pages: ChatPage[];
  private maxMessagesPerPage: number;
  private chatId: string | null = null;

  public constructor(chatId: string, pages?: ChatPage[]) {
    this.maxMessagesPerPage = this.MAX_MESSAGES_PER_PAGE;
    this.pages = pages || [];
    this.chatId = chatId;
  }

  public addMessage(message: Message): void {
    if (!this.chatId) {
      throw new Error(
        "ChatPageManager: currentChatId is not set. Cannot add message. " +
          "Initialize the manager with a chatId or ensure pages with a chatId are provided."
      );
    }

    let currentPage = this._getCurrentPage();

    if (!currentPage || this._currentPageIsFull(currentPage)) {
      const newPage = this._createNewPage([message]);
      this.pages.push(newPage);
    } else {
      currentPage.messages.push(message);
    }
  }

  public getMessageList(): Message[] {
    return this.pages.flatMap((page) => page.messages);
  }

  public getPages(): ChatPage[] {
    return this.pages;
  }

  private _getCurrentPage(): ChatPage | null {
    return this.pages.length > 0 ? this.pages[this.pages.length - 1] : null;
  }

  private _currentPageIsFull(currentPage: ChatPage): boolean {
    return currentPage.messages.length >= this.maxMessagesPerPage;
  }

  private _createNewPage(initialMessages: Message[] = []): ChatPage {
    if (!this.chatId) {
      throw new Error(
        "ChatPageManager: currentChatId is not set. Cannot create a new page."
      );
    }
    return {
      chatId: this.chatId,
      pageId: Date.now().toString(),
      messages: initialMessages,
    };
  }
}
