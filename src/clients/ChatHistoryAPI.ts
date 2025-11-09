import config from "../Config";
import { EncryptionManager } from "../Managers/EncryptionManager";
import type { Message } from "../pages/Chat/ChatMessage";
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

  public async getChatHistory(chatId: string): Promise<Message[]> {
    const accessToken = await this.authAPI.getAccessToken();

    const response = await fetch(
      `${this.URL}/api/GetChatHistory`,
      buildGetChatHistoryRequest(chatId, accessToken)
    );

    if (response.ok) {
      const chatHistoryResponse: ChatHistoryResponse = await response.json();
      return this.decryptMessages(chatHistoryResponse.messages);
    } else {
      console.error("Failed to get chat history:", response.statusText);
      throw new Error(`Error fetching chat history: ${response.statusText}`);
    }
  }

  public async addChatMessage(
    chatId: string,
    message: Message
  ): Promise<boolean> {
    const accessToken = await this.authAPI.getAccessToken();
    const encryptedMessage = await this.encryptMessage(message);

    const response = await fetch(
      `${this.URL}/api/AddChatMessage`,
      buildAddChatMessageRequest(chatId, encryptedMessage, accessToken)
    );

    if (response.ok) {
      return true;
    } else {
      console.error("Failed to add chat message:", response.statusText);
      return false;
    }
  }

  public async addChatMessages(
    chatId: string,
    messages: Message[]
  ): Promise<boolean> {
    const accessToken = await this.authAPI.getAccessToken();
    const encryptedMessages = await this.encryptMessages(messages);

    const response = await fetch(
      `${this.URL}/api/AddChatMessages`,
      buildAddChatMessagesRequest(chatId, encryptedMessages, accessToken)
    );

    if (response.ok) {
      return true;
    } else {
      console.error("Failed to add chat messages:", response.statusText);
      return false;
    }
  }

  public async saveChatHistory(
    chatId: string,
    messages: Message[]
  ): Promise<boolean> {
    const accessToken = await this.authAPI.getAccessToken();
    const encryptedMessages = await this.encryptMessages(messages);

    const response = await fetch(
      `${this.URL}/api/SaveChatHistory`,
      buildSaveChatHistoryRequest(chatId, encryptedMessages, accessToken)
    );

    if (response.ok) {
      return true;
    } else {
      console.error("Failed to save chat history:", response.statusText);
      return false;
    }
  }

  public async getChatIds(): Promise<string[]> {
    const accessToken = await this.authAPI.getAccessToken();

    const response = await fetch(`${this.URL}/api/GetChats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const chats = await response.json();
      return chats.filter(
        (chatId: string) => chatId !== "SAMPLE_IMAGE_GENERATOR"
      );
    } else {
      console.error("Failed to get chats:", response.statusText);
      throw new Error(`Error fetching chats: ${response.statusText}`);
    }
  }

  public async deleteChat(chatId: string): Promise<boolean> {
    const accessToken = await this.authAPI.getAccessToken();

    const response = await fetch(
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

  async encryptMessage(message: Message): Promise<Message> {
    await this.encryptionManager.ensureKeysInitialized();

    const encryptedContent = await this.encryptionManager.encryptString(
      this.encryptionManager.chatEncryptionKey!,
      message.content
    );

    return { ...message, content: encryptedContent };
  }

  async decryptMessage(message: Message): Promise<Message> {
    await this.encryptionManager.ensureKeysInitialized();

    const decryptedContent = await this.encryptionManager.decryptString(
      this.encryptionManager.chatEncryptionKey!,
      message.content
    );

    return { ...message, content: decryptedContent };
  }

  async encryptMessages(messages: Message[]): Promise<Message[]> {
    return await Promise.all(
      messages.map((message) => this.encryptMessage(message))
    );
  }

  async decryptMessages(messages: Message[]): Promise<Message[]> {
    return await Promise.all(
      messages.map((message) => this.decryptMessage(message))
    );
  }
}

function buildGetChatHistoryRequest(
  chatId: string,
  accessToken: string
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ chatId }),
  };
}

function buildAddChatMessageRequest(
  chatId: string,
  message: Message,
  accessToken: string
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ chatId, message }),
  };
}

function buildAddChatMessagesRequest(
  chatId: string,
  messages: Message[],
  accessToken: string
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ chatId, messages }),
  };
}

function buildSaveChatHistoryRequest(
  chatId: string,
  messages: Message[],
  accessToken: string
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ chatId, messages }),
  };
}

function buildDeleteChatRequest(
  chatId: string,
  accessToken: string
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ chatId }),
  };
}

interface ChatHistoryResponse {
  chatId: string;
  messages: Message[];
}
