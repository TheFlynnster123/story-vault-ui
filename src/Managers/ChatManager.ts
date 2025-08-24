import type { ChatPage } from "../models/ChatPage";
import type { Message } from "../pages/Chat/ChatMessage";

export class ChatManager {
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
    return this.pages
      .flatMap((page) => page.messages)
      .filter((msg) => msg.role !== "civit-job");
  }

  public getPages(): ChatPage[] {
    return this.pages;
  }

  public getMessage(messageId: string): Message | null {
    for (const page of this.pages) {
      const message = page.messages.find(msg => msg.id === messageId);
      if (message) return message;
    }
    return null;
  }

  public deleteMessage(messageId: string): ChatPage[] {
    const location = this.findMessageLocation(messageId);
    if (!location) {
      console.warn(`Message with id ${messageId} not found`);
      return this.pages;
    }

    const { pageIndex, messageIndex } = location;
    const targetPage = this.pages[pageIndex];

    // Remove the message from the page
    targetPage.messages.splice(messageIndex, 1);

    return this.pages;
  }

  public deleteMessagesAfterIndex(messageId: string): ChatPage[] {
    const globalIndex = this.getGlobalMessageIndex(messageId);
    if (globalIndex === -1) {
      console.warn(`Message with id ${messageId} not found`);
      return this.pages;
    }

    const location = this.findMessageLocation(messageId);

    if (!location) return this.pages;

    const { pageIndex, messageIndex } = location;

    // Remove messages from the current page starting from messageIndex
    this.pages[pageIndex].messages.splice(messageIndex);

    // Clear all messages from subsequent pages
    for (let i = pageIndex + 1; i < this.pages.length; i++)
      this.pages[i].messages = [];

    return this.pages;
  }

  public findMessageLocation(
    messageId: string
  ): { pageIndex: number; messageIndex: number } | null {
    for (let pageIndex = 0; pageIndex < this.pages.length; pageIndex++) {
      const page = this.pages[pageIndex];
      const messageIndex = page.messages.findIndex(
        (msg) => msg.id === messageId
      );

      if (messageIndex !== -1) return { pageIndex, messageIndex };
    }
    return null;
  }

  public getGlobalMessageIndex(messageId: string): number {
    let globalIndex = 0;
    for (const page of this.pages) {
      const messageIndex = page.messages.findIndex(
        (msg) => msg.id === messageId
      );
      if (messageIndex !== -1) {
        return globalIndex + messageIndex;
      }
      globalIndex += page.messages.length;
    }
    return -1;
  }

  public countMessagesFromIndex(messageId: string): {
    messageCount: number;
    pageCount: number;
  } {
    const location = this.findMessageLocation(messageId);
    if (!location) return { messageCount: 0, pageCount: 0 };

    const { pageIndex, messageIndex } = location;
    let messageCount = 0;
    let pageCount = 0;

    messageCount += this.pages[pageIndex].messages.length - messageIndex;
    pageCount = 1;

    for (let i = pageIndex + 1; i < this.pages.length; i++) {
      messageCount += this.pages[i].messages.length;
      if (this.pages[i].messages.length > 0) pageCount++;
    }

    return { messageCount, pageCount };
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
