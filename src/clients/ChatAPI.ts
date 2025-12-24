import { d } from "../app/Dependencies/Dependencies";
import config from "../Config";

export class ChatAPI {
  public URL: string;

  constructor() {
    this.URL = config.storyVaultAPIURL;
  }

  public async getChatIds(): Promise<string[]> {
    const accessToken = await d.AuthAPI().getAccessToken();

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
    const accessToken = await d.AuthAPI().getAccessToken();

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
