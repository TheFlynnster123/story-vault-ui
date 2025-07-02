import config from "../Config";
import type { EncryptionManager } from "../Managers/EncryptionManager";

interface SaveNoteRequest {
  chatId: string;
  noteName: string;
  content: string;
}

interface GetNoteRequest {
  chatId: string;
  noteName: string;
}

interface DeleteNoteRequest {
  chatId: string;
  noteName: string;
}

interface GetNoteResponse {
  content: string;
}

export class NoteAPI {
  public accessToken: string;
  public URL: string;
  public encryptionManager: EncryptionManager;

  constructor(encryptionManager: EncryptionManager, accessToken: string) {
    if (!accessToken) throw new Error("Access token is required");
    this.encryptionManager = encryptionManager;
    this.URL = config.storyVaultAPIURL;
    this.accessToken = accessToken;
  }

  public async saveNote(
    chatId: string,
    noteName: string,
    content: string
  ): Promise<boolean> {
    try {
      const encryptedContent = await this.encryptionManager.encryptString(
        this.encryptionManager.chatEncryptionKey!,
        content
      );

      const response = await fetch(
        `${this.URL}/api/SaveNote`,
        buildSaveNoteRequest(
          { chatId, noteName, content: encryptedContent },
          this.accessToken
        )
      );

      if (response.ok) {
        return true;
      } else if (response.status === 400) {
        console.error("Invalid input for save note:", response.statusText);
        throw new Error(`Invalid input: ${response.statusText}`);
      } else if (response.status === 401) {
        console.error(
          "Unauthorized access for save note:",
          response.statusText
        );
        throw new Error(`Unauthorized: ${response.statusText}`);
      } else if (response.status === 500) {
        console.error("Server error for save note:", response.statusText);
        throw new Error(`Server error: ${response.statusText}`);
      } else {
        console.error("Failed to save note:", response.statusText);
        throw new Error(`Error saving note: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to save note:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unknown error occurred while saving note");
    }
  }

  public async getNote(
    chatId: string,
    noteName: string
  ): Promise<string | undefined> {
    try {
      const response = await fetch(
        `${this.URL}/api/GetNote`,
        buildGetNoteRequest({ chatId, noteName }, this.accessToken)
      );

      if (response.ok) {
        const noteResponse: GetNoteResponse = await response.json();
        const decryptedContent = await this.encryptionManager.decryptString(
          this.encryptionManager.chatEncryptionKey!,
          noteResponse.content
        );
        return decryptedContent;
      } else if (response.status === 404) {
        return undefined;
      } else if (response.status === 400) {
        console.error("Invalid input for get note:", response.statusText);
        throw new Error(`Invalid input: ${response.statusText}`);
      } else if (response.status === 401) {
        console.error("Unauthorized access for get note:", response.statusText);
        throw new Error(`Unauthorized: ${response.statusText}`);
      } else if (response.status === 500) {
        console.error("Server error for get note:", response.statusText);
        throw new Error(`Server error: ${response.statusText}`);
      } else {
        console.error("Failed to get note:", response.statusText);
        throw new Error(`Error fetching note: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to get note:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unknown error occurred while fetching note");
    }
  }

  public async deleteNote(chatId: string, noteName: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.URL}/api/DeleteNote`,
        buildDeleteNoteRequest({ chatId, noteName }, this.accessToken)
      );

      if (response.ok) {
        return true;
      } else if (response.status === 400) {
        console.error("Invalid input for delete note:", response.statusText);
        throw new Error(`Invalid input: ${response.statusText}`);
      } else if (response.status === 401) {
        console.error(
          "Unauthorized access for delete note:",
          response.statusText
        );
        throw new Error(`Unauthorized: ${response.statusText}`);
      } else if (response.status === 500) {
        console.error("Server error for delete note:", response.statusText);
        throw new Error(`Server error: ${response.statusText}`);
      } else {
        console.error("Failed to delete note:", response.statusText);
        throw new Error(`Error deleting note: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unknown error occurred while deleting note");
    }
  }
}

// Helper functions for building requests
function buildSaveNoteRequest(
  request: SaveNoteRequest,
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

function buildGetNoteRequest(
  request: GetNoteRequest,
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

function buildDeleteNoteRequest(
  request: DeleteNoteRequest,
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
