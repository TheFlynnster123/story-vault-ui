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

      if (response.ok) {
        return true;
      } else if (response.status === 400) {
        console.error("Invalid input for save blob:", response.statusText);
        throw new Error(`Invalid input: ${response.statusText}`);
      } else if (response.status === 401) {
        console.error(
          "Unauthorized access for save blob:",
          response.statusText
        );
        throw new Error(`Unauthorized: ${response.statusText}`);
      } else if (response.status === 500) {
        console.error("Server error for save blob:", response.statusText);
        throw new Error(`Server error: ${response.statusText}`);
      } else {
        console.error("Failed to save blob:", response.statusText);
        throw new Error(`Error saving blob: ${response.statusText}`);
      }
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

      if (response.ok) {
        const blobResponse: GetBlobResponse = await response.json();
        const decryptedContent = await this.encryptionManager.decryptString(
          this.encryptionManager.chatEncryptionKey!,
          blobResponse.content
        );
        return decryptedContent;
      } else if (response.status === 404) {
        return undefined;
      } else if (response.status === 400) {
        console.error("Invalid input for get blob:", response.statusText);
        throw new Error(`Invalid input: ${response.statusText}`);
      } else if (response.status === 401) {
        console.error("Unauthorized access for get blob:", response.statusText);
        throw new Error(`Unauthorized: ${response.statusText}`);
      } else if (response.status === 500) {
        console.error("Server error for get blob:", response.statusText);
        throw new Error(`Server error: ${response.statusText}`);
      } else {
        console.error("Failed to get blob:", response.statusText);
        throw new Error(`Error fetching blob: ${response.statusText}`);
      }
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

      if (response.ok) {
        return true;
      } else if (response.status === 400) {
        console.error("Invalid input for delete blob:", response.statusText);
        throw new Error(`Invalid input: ${response.statusText}`);
      } else if (response.status === 401) {
        console.error(
          "Unauthorized access for delete blob:",
          response.statusText
        );
        throw new Error(`Unauthorized: ${response.statusText}`);
      } else if (response.status === 500) {
        console.error("Server error for delete blob:", response.statusText);
        throw new Error(`Server error: ${response.statusText}`);
      } else {
        console.error("Failed to delete blob:", response.statusText);
        throw new Error(`Error deleting blob: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to delete blob:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unknown error occurred while deleting blob");
    }
  }
}

// Helper functions for building requests
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
