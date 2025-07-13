import config from "../Config";
import { EncryptionManager } from "../Managers/EncryptionManager";
import type { ChatPage } from "../models/ChatPage";
import { AuthAPI } from "./AuthAPI";

export class ChatHistoryAPI {
  public URL: string;
  public encryptionManager: EncryptionManager;

  authAPI: AuthAPI;

  constructor() {
    this.URL = config.storyVaultAPIURL;

    this.authAPI = new AuthAPI();
    this.encryptionManager = new EncryptionManager();
  }

  public async saveChatPage(chatPage: ChatPage): Promise<boolean> {
    var accessToken = await this.authAPI.getAccessToken();

    const encryptedPage = await this.EncryptPage(chatPage);
    var response = await fetch(
      `${this.URL}/api/SaveChatPage`,
      buildSaveChatPageRequest(encryptedPage, accessToken)
    );

    if (response.ok) {
      return true;
    } else {
      console.error("Failed to save chat page:", response.statusText);
      return false;
    }
  }

  public async getChatHistory(chatId: string): Promise<ChatPage[]> {
    var accessToken = await this.authAPI.getAccessToken();

    var response = await fetch(
      `${this.URL}/api/GetChatHistory`,
      buildGetChatHistoryRequest(chatId, accessToken)
    );

    if (response.ok) {
      const pages = await response.json();
      return Promise.all(
        pages.map(async (p: ChatPage) => await this.DecryptPage(p))
      );
    } else {
      console.error("Failed to get chat history:", response.statusText);
      throw new Error(`Error fetching chat history: ${response.statusText}`);
    }
  }

  public async getChatPage(chatId: string, pageId: string): Promise<ChatPage> {
    var accessToken = await this.authAPI.getAccessToken();

    var response = await fetch(
      `${this.URL}/api/GetChatPage`,
      buildGetChatPageRequest(chatId, pageId, accessToken)
    );

    if (response.ok) {
      const page = await response.json();
      return await this.DecryptPage(page);
    } else {
      console.error("Failed to get chat page:", response.statusText);
      throw new Error(`Error fetching chat page: ${response.statusText}`);
    }
  }

  public async getChats(): Promise<string[]> {
    var accessToken = await this.authAPI.getAccessToken();

    var response = await fetch(`${this.URL}/api/GetChats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      return response.json();
    } else {
      console.error("Failed to get chats:", response.statusText);
      throw new Error(`Error fetching chat page: ${response.statusText}`);
    }
  }

  public async deleteChat(chatId: string): Promise<boolean> {
    var accessToken = await this.authAPI.getAccessToken();

    var response = await fetch(
      `${this.URL}/api/DeleteChat`,
      buildDeleteChatRequest(chatId, accessToken)
    );

    if (response.ok) {
      return true;
    } else {
      console.error("Failed to delete chat:", response.statusText);
      return false;
    }
  }

  private async EncryptPage(chatPage: ChatPage): Promise<ChatPage> {
    await this.encryptionManager.ensureKeysInitialized();

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
    await this.encryptionManager.ensureKeysInitialized();

    const decryptedMessages = await Promise.all(
      chatPage.messages.map(async (message) => {
        console.log("unencrypting page!");

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

function buildDeleteChatRequest(
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
