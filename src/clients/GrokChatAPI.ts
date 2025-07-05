import type { Message } from "../Chat/ChatMessage";
import type { EncryptionManager } from "../Managers/EncryptionManager";
import { BaseAPIClient } from "./BaseAPIClient";

interface PostChatRequest {
  messages: Message[];
}

export class GrokChatAPI extends BaseAPIClient {
  constructor(encryptionManager: EncryptionManager, accessToken: string) {
    if (!accessToken)
      throw new Error("Access token is required for GrokChatAPI.");

    if (!encryptionManager)
      throw new Error("EncryptionManager not found in grok chat api!");

    super(encryptionManager, accessToken);
  }

  public async postChat(
    messages: Message[],
    reasoning?: "high" | "low"
  ): Promise<string> {
    const headers: Record<string, string> = {
      EncryptionKey: this.encryptionManager.grokEncryptionKey as string,
    };

    if (reasoning) {
      headers.Reasoning = reasoning;
    }

    const requestBody: PostChatRequest = {
      messages: messages,
    };

    const response = await this.makeRequest<{ reply: string }>(
      `/api/PostChat`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers,
      }
    );

    return response.reply;
  }
}
