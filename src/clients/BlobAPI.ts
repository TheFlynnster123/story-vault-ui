import config from "../Config";
import type { EncryptionManager } from "../Managers/EncryptionManager";

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
  public accessToken: string;
  public URL: string;
  public encryptionManager: EncryptionManager;

  constructor(encryptionManager: EncryptionManager, accessToken: string) {
    if (!accessToken) throw new Error("Access token is required");
    this.encryptionManager = encryptionManager;
    this.URL = config.storyVaultAPIURL;
    this.accessToken = accessToken;
  }

  public async saveBlob(
    chatId: string,
    blobName: string,
    content: string
  ): Promise<boolean> {
    try {
      const encryptedContent = await this.encryptionManager.encryptString(
        this.encryptionManager.chatEncryptionKey!,
        content
      );

      const response = await fetch(
        `${this.URL}/api/SaveBlob`,
        buildSaveBlobRequest(
          { chatId, blobName, content: encryptedContent },
          this.accessToken
        )
      );

      validateResponse(response, "save blob");
      return true;
    } catch (error) {
      console.error("Failed to save blob:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unknown error occurred while saving blob");
    }
  }

  public async getBlob(
    chatId: string,
    blobName: string
  ): Promise<string | undefined> {
    try {
      const response = await fetch(
        `${this.URL}/api/GetBlob`,
        buildGetBlobRequest({ chatId, blobName }, this.accessToken)
      );

      validateGetBlobResponse(response);
      const blobResponse: GetBlobResponse = await response.json();
      const decryptedContent = await this.encryptionManager.decryptString(
        this.encryptionManager.chatEncryptionKey!,
        blobResponse.content
      );
      return decryptedContent;
    } catch (error) {
      console.error("Failed to get blob:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unknown error occurred while fetching blob");
    }
  }

  public async deleteBlob(chatId: string, blobName: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.URL}/api/DeleteBlob`,
        buildDeleteBlobRequest({ chatId, blobName }, this.accessToken)
      );

      validateResponse(response, "delete blob");
      return true;
    } catch (error) {
      console.error("Failed to delete blob:", error);
      if (error instanceof Error) {
        throw error;
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
