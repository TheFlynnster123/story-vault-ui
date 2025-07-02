import type { Message } from "../Chat/ChatMessage";
import Config from "../Config";
import type { EncryptionManager } from "../Managers/EncryptionManager";

export class GrokChatAPI {
  encryptionManger: EncryptionManager;
  accessToken: string;

  constructor(encryptionManager: EncryptionManager, accessToken: string) {
    if (!accessToken)
      throw new Error("Access token is required for GrokChatAPI.");

    if (!encryptionManager)
      throw new Error("EncryptionManager not found in grok chat api!");

    this.encryptionManger = encryptionManager;
    this.accessToken = accessToken;
  }

  public async postChat(
    message: Message[],
    reasoning?: "high" | "low"
  ): Promise<string> {
    try {
      const request = buildPostChatRequest(
        this.encryptionManger.grokEncryptionKey as string,
        this.accessToken,
        message,
        reasoning
      );

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
  encryptionKey: string,
  accessToken: string,
  messages: Message[],
  reasoning?: "high" | "low"
): RequestInit | undefined {
  const headers: Record<string, string> = {
    EncryptionKey: encryptionKey,
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  if (reasoning) {
    headers.Reasoning = reasoning;
  }

  return {
    method: "POST",
    headers,
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
