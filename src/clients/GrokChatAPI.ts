import Config from "../Config";

export class GrokChatAPI {
  accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken)
      throw new Error("Access token is required for GrokChatAPI.");

    this.accessToken = accessToken;
  }

  public async postChatMessage(message: string): Promise<string> {
    try {
      const request = buildPostChatMessageRequest(this.accessToken, message);

      const response = await fetch(
        `${Config.storyVaultAPIURL}/api/PostChatMessage`,
        request
      );

      if (!response.ok) throw invalidResponseError(response);

      const responseData = await response.json();

      return responseData.reply;
    } catch (fetchError: any) {
      throw fetchError(fetchError);
    }
  }
}

function fetchError(fetchError: any): Error {
  console.error("[GrokChatAPI] Fetch error in postChatMessage:", fetchError);

  return fetchError instanceof Error
    ? fetchError
    : new Error(String(fetchError));
}

function buildPostChatMessageRequest(
  accessToken: string,
  message: string
): RequestInit | undefined {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message }),
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
