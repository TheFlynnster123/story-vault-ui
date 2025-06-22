import config from "../Config";
import type { EncryptionManager } from "../Managers/EncryptionManager";
import type { ChatPage } from "../models/ChatPage";

export class ChatHistoryAPI {
  public accessToken: string;
  public URL: string;
  public encryptionManager: EncryptionManager;

  constructor(encryptionManager: EncryptionManager, accessToken: string) {
    this.encryptionManager = encryptionManager;
    this.URL = config.storyVaultAPIURL;
    this.accessToken = accessToken;
  }

  public async saveChatPage(chatPage: ChatPage): Promise<boolean> {
    const encryptedPage = await this.EncryptPage(chatPage);
    var response = await fetch(
      `${this.URL}/api/SaveChatPage`,
      buildSaveChatPageRequest(encryptedPage, this.accessToken)
    );

    if (response.ok) {
      return true;
    } else {
      console.error("Failed to save chat page:", response.statusText);
      return false;
    }
  }

  public async getChatHistory(chatId: string): Promise<ChatPage[]> {
    var response = await fetch(
      `${this.URL}/api/GetChatHistory`,
      buildGetChatHistoryRequest(chatId, this.accessToken)
    );

    if (response.ok) {
      const pages = await response.json();
      return Promise.all(pages.map((p: ChatPage) => this.DecryptPage(p)));
    } else {
      console.error("Failed to get chat history:", response.statusText);
      throw new Error(`Error fetching chat history: ${response.statusText}`);
    }
  }

  public async getChatPage(chatId: string, pageId: string): Promise<ChatPage> {
    var response = await fetch(
      `${this.URL}/api/GetChatPage`,
      buildGetChatPageRequest(chatId, pageId, this.accessToken)
    );

    if (response.ok) {
      const page = await response.json();
      return this.DecryptPage(page);
    } else {
      console.error("Failed to get chat page:", response.statusText);
      throw new Error(`Error fetching chat page: ${response.statusText}`);
    }
  }

  public async getChats(): Promise<string[]> {
    var response = await fetch(`${this.URL}/api/GetChats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (response.ok) {
      return response.json();
    } else {
      console.error("Failed to get chats:", response.statusText);
      throw new Error(`Error fetching chat page: ${response.statusText}`);
    }
  }

  private async EncryptPage(chatPage: ChatPage): Promise<ChatPage> {
    const encryptedMessages = await Promise.all(
      chatPage.messages.map(async (message) => {
        const encryptedContent = await this.encryptionManager.encryptString(
          this.encryptionManager.chatEncryptionKey!,
          message.content
        );
        return { ...message, content: encryptedContent };
      })
    );

    return { ...chatPage, messages: encryptedMessages };
  }

  private async DecryptPage(chatPage: ChatPage): Promise<ChatPage> {
    const decryptedMessages = await Promise.all(
      chatPage.messages.map(async (message) => {
        const decryptedContent = await this.encryptionManager.decryptString(
          this.encryptionManager.chatEncryptionKey!,
          message.content
        );
        return { ...message, content: decryptedContent };
      })
    );

    return { ...chatPage, messages: decryptedMessages };
  }
}

function buildGetChatPageRequest(
  chatId: string,
  pageId: string,
  accessToken: string
): RequestInit | undefined {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ chatId, pageId }),
  };
}

function buildSaveChatPageRequest(
  chatPage: ChatPage,
  accessToken: string
): RequestInit | undefined {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(chatPage),
  };
}

function buildGetChatHistoryRequest(
  chatId: string,
  accessToken: string
): RequestInit | undefined {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ chatId }),
  };
}
