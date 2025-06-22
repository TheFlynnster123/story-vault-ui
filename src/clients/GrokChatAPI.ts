import type { Message } from "../Chat/ChatMessage";
import Config from "../Config";

export class GrokChatAPI {
  accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken)
      throw new Error("Access token is required for GrokChatAPI.");

    this.accessToken = accessToken;
  }

  public async postChat(message: Message[]): Promise<string> {
    try {
      const request = buildPostChatRequest(this.accessToken, message);

      const response = await fetch(
        `${Config.storyVaultAPIURL}/api/PostChat`,
        request
      );

      if (!response.ok) throw invalidResponseError(response);

      const responseData = await response.json();

      return responseData.reply;
    } catch (error: any) {
      throw fetchError(error);
    }
  }
}

function buildPostChatRequest(
  accessToken: string,
  messages: Message[]
): RequestInit | undefined {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(messages),
  };
}

function invalidResponseError(response: Response): Error {
  console.error(
    "[GrokChatAPI] Response not OK:",
    response.status,
    response.statusText
  );

  return new Error(`Grok API Error: ${response.status} ${response.statusText}`);
}

function fetchError(error: any): Error {
  console.error("[GrokChatAPI] Fetch error in postChatMessage:", error);

  return error instanceof Error ? error : new Error(String(error));
}
