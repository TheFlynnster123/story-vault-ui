import { d } from "../Dependencies";
import Config from "../../components/Common/Config";

interface SaveBlobRequest {
  chatId: string;
  blobName: string;
  content: string;
}

interface GetBlobRequest {
  chatId: string;
  blobName: string;
}

interface DeleteBlobRequest {
  chatId: string;
  blobName: string;
}

interface GetBlobResponse {
  content: string;
}

export class BlobAPI {
  GLOBAL_CHAT_ID = "global";

  public URL: string;

  constructor() {
    this.URL = Config.storyVaultAPIURL;
  }

  private async getAccessToken(): Promise<string> {
    return await d.AuthAPI().getAccessToken();
  }

  public async saveBlob(
    chatId: string,
    blobName: string,
    content: string
  ): Promise<boolean> {
    try {
      const encryptedContent = await d
        .EncryptionManager()!
        .encryptString("chat", content);

      const accessToken = await this.getAccessToken();
      const response = await fetch(
        `${this.URL}/api/SaveBlob`,
        buildSaveBlobRequest(
          { chatId, blobName, content: encryptedContent },
          accessToken
        )
      );

      validateResponse(response, "save blob");
      return true;
    } catch (e) {
      d.ErrorService().log("Failed to save blob", e as Error);
      if (e instanceof Error) {
        throw e;
      }
      throw new Error("Unknown error occurred while saving blob");
    }
  }

  public async getBlob(
    chatId: string,
    blobName: string
  ): Promise<string | undefined> {
    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(
        `${this.URL}/api/GetBlob`,
        buildGetBlobRequest({ chatId, blobName }, accessToken)
      );

      validateGetBlobResponse(response);
      const blobResponse: GetBlobResponse = await response.json();

      const decryptedContent = await d
        .EncryptionManager()!
        .decryptString("chat", blobResponse.content);

      return decryptedContent;
    } catch (e: any) {
      if (e instanceof Error) {
        throw e;
      }
      throw new Error("Unknown error occurred while fetching blob");
    }
  }

  public async deleteBlob(chatId: string, blobName: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(
        `${this.URL}/api/DeleteBlob`,
        buildDeleteBlobRequest({ chatId, blobName }, accessToken)
      );

      validateResponse(response, "delete blob");
      return true;
    } catch (e) {
      d.ErrorService().log("Failed to delete blob", e);
      if (e instanceof Error) {
        throw e;
      }
      throw new Error("Unknown error occurred while deleting blob");
    }
  }
}

function validateResponse(response: Response, context: string) {
  if (response.ok) return;

  if (response.status === 400) {
    console.error(`Invalid input for ${context}:`, response.statusText);
    throw new Error(`Invalid input: ${response.statusText}`);
  }
  if (response.status === 401) {
    console.error(`Unauthorized access for ${context}:`, response.statusText);
    throw new Error(`Unauthorized: ${response.statusText}`);
  }
  if (response.status === 500) {
    console.error(`Server error for ${context}:`, response.statusText);
    throw new Error(`Server error: ${response.statusText}`);
  }

  console.error(`Failed to ${context}:`, response.statusText);
  throw new Error(`Error performing ${context}: ${response.statusText}`);
}

function validateGetBlobResponse(response: Response) {
  if (response.ok) return;

  if (response.status === 404) throw new Error("Blob not found!");

  validateResponse(response, "get blob");
}

function buildSaveBlobRequest(
  request: SaveBlobRequest,
  accessToken: string
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  };
}

function buildGetBlobRequest(
  request: GetBlobRequest,
  accessToken: string
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  };
}

function buildDeleteBlobRequest(
  request: DeleteBlobRequest,
  accessToken: string
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  };
}
