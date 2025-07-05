import { describe, it, expect, vi, beforeEach } from "vitest";
import { NoteAPI } from "../../clients/NoteAPI";
import type { EncryptionManager } from "../../Managers/EncryptionManager";

// Mock Config
vi.mock("../../Config", () => ({
  default: {
    storyVaultAPIURL: "https://test-api.com",
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("NoteAPI", () => {
  let mockEncryptionManager: EncryptionManager;
  let noteAPI: NoteAPI;
  const mockAccessToken = "test-access-token";

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock EncryptionManager
    mockEncryptionManager = {
      chatEncryptionKey: "test-chat-key",
      encryptString: vi
        .fn()
        .mockImplementation(async (key, content) => `encrypted_${content}`),
      decryptString: vi
        .fn()
        .mockImplementation(async (key, content) =>
          content.replace("encrypted_", "")
        ),
    } as any;

    noteAPI = new NoteAPI(mockEncryptionManager, mockAccessToken);
  });

  describe("constructor", () => {
    it("should initialize with valid parameters", () => {
      expect(noteAPI).toBeInstanceOf(NoteAPI);
      expect(noteAPI.encryptionManager).toBe(mockEncryptionManager);
      expect(noteAPI.accessToken).toBe(mockAccessToken);
      expect(noteAPI.URL).toBe("https://test-api.com");
    });

    it("should throw error when access token is missing", () => {
      expect(() => {
        new NoteAPI(mockEncryptionManager, "");
      }).toThrow("Access token is required");
    });
  });

  describe("saveNote", () => {
    it("should successfully save a note", async () => {
      const mockResponse = {
        ok: true,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await noteAPI.saveNote(
        "test-chat-1",
        "test-note",
        "Note content"
      );

      expect(result).toBe(true);
      expect(mockEncryptionManager.encryptString).toHaveBeenCalledWith(
        "test-chat-key",
        "Note content"
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/SaveNote",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({
            chatId: "test-chat-1",
            noteName: "test-note",
            content: "encrypted_Note content",
          }),
        }
      );
    });

    it("should handle 400 Bad Request error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        status: 400,
        statusText: "Bad Request",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        noteAPI.saveNote("test-chat-1", "test-note", "Note content")
      ).rejects.toThrow("Invalid input: Bad Request");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Invalid input for save note:",
        "Bad Request"
      );
      consoleSpy.mockRestore();
    });

    it("should handle 401 Unauthorized error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        noteAPI.saveNote("test-chat-1", "test-note", "Note content")
      ).rejects.toThrow("Unauthorized: Unauthorized");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Unauthorized access for save note:",
        "Unauthorized"
      );
      consoleSpy.mockRestore();
    });

    it("should handle 500 Server Error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        noteAPI.saveNote("test-chat-1", "test-note", "Note content")
      ).rejects.toThrow("Server error: Internal Server Error");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Server error for save note:",
        "Internal Server Error"
      );
      consoleSpy.mockRestore();
    });

    it("should handle other HTTP errors", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        status: 403,
        statusText: "Forbidden",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        noteAPI.saveNote("test-chat-1", "test-note", "Note content")
      ).rejects.toThrow("Error saving note: Forbidden");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save note:",
        "Forbidden"
      );
      consoleSpy.mockRestore();
    });

    it("should handle network errors", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const networkError = new Error("Network error");
      (global.fetch as any).mockRejectedValue(networkError);

      await expect(
        noteAPI.saveNote("test-chat-1", "test-note", "Note content")
      ).rejects.toThrow("Network error");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save note:",
        networkError
      );
      consoleSpy.mockRestore();
    });

    it("should handle unknown errors", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (global.fetch as any).mockRejectedValue("String error");

      await expect(
        noteAPI.saveNote("test-chat-1", "test-note", "Note content")
      ).rejects.toThrow("Unknown error occurred while saving note");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save note:",
        "String error"
      );
      consoleSpy.mockRestore();
    });
  });

  describe("getNote", () => {
    it("should successfully get a note", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ content: "encrypted_Note content" }),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await noteAPI.getNote("test-chat-1", "test-note");

      expect(result).toBe("Note content");
      expect(mockEncryptionManager.decryptString).toHaveBeenCalledWith(
        "test-chat-key",
        "encrypted_Note content"
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/GetNote",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({
            chatId: "test-chat-1",
            noteName: "test-note",
          }),
        }
      );
    });

    it("should return undefined for 404 Not Found", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await noteAPI.getNote("test-chat-1", "nonexistent-note");

      expect(result).toBeUndefined();
    });

    it("should handle 400 Bad Request error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        status: 400,
        statusText: "Bad Request",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(noteAPI.getNote("test-chat-1", "test-note")).rejects.toThrow(
        "Invalid input: Bad Request"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Invalid input for get note:",
        "Bad Request"
      );
      consoleSpy.mockRestore();
    });

    it("should handle 401 Unauthorized error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(noteAPI.getNote("test-chat-1", "test-note")).rejects.toThrow(
        "Unauthorized: Unauthorized"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Unauthorized access for get note:",
        "Unauthorized"
      );
      consoleSpy.mockRestore();
    });

    it("should handle 500 Server Error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(noteAPI.getNote("test-chat-1", "test-note")).rejects.toThrow(
        "Server error: Internal Server Error"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Server error for get note:",
        "Internal Server Error"
      );
      consoleSpy.mockRestore();
    });

    it("should handle other HTTP errors", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        status: 403,
        statusText: "Forbidden",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(noteAPI.getNote("test-chat-1", "test-note")).rejects.toThrow(
        "Error fetching note: Forbidden"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get note:",
        "Forbidden"
      );
      consoleSpy.mockRestore();
    });

    it("should handle network errors", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const networkError = new Error("Network error");
      (global.fetch as any).mockRejectedValue(networkError);

      await expect(noteAPI.getNote("test-chat-1", "test-note")).rejects.toThrow(
        "Network error"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get note:",
        networkError
      );
      consoleSpy.mockRestore();
    });

    it("should handle unknown errors", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (global.fetch as any).mockRejectedValue("String error");

      await expect(noteAPI.getNote("test-chat-1", "test-note")).rejects.toThrow(
        "Unknown error occurred while fetching note"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get note:",
        "String error"
      );
      consoleSpy.mockRestore();
    });
  });

  describe("deleteNote", () => {
    it("should successfully delete a note", async () => {
      const mockResponse = {
        ok: true,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await noteAPI.deleteNote("test-chat-1", "test-note");

      expect(result).toBe(true);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/DeleteNote",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({
            chatId: "test-chat-1",
            noteName: "test-note",
          }),
        }
      );
    });

    it("should handle 400 Bad Request error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        status: 400,
        statusText: "Bad Request",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        noteAPI.deleteNote("test-chat-1", "test-note")
      ).rejects.toThrow("Invalid input: Bad Request");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Invalid input for delete note:",
        "Bad Request"
      );
      consoleSpy.mockRestore();
    });

    it("should handle 401 Unauthorized error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        noteAPI.deleteNote("test-chat-1", "test-note")
      ).rejects.toThrow("Unauthorized: Unauthorized");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Unauthorized access for delete note:",
        "Unauthorized"
      );
      consoleSpy.mockRestore();
    });

    it("should handle 500 Server Error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        noteAPI.deleteNote("test-chat-1", "test-note")
      ).rejects.toThrow("Server error: Internal Server Error");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Server error for delete note:",
        "Internal Server Error"
      );
      consoleSpy.mockRestore();
    });

    it("should handle other HTTP errors", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        status: 403,
        statusText: "Forbidden",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        noteAPI.deleteNote("test-chat-1", "test-note")
      ).rejects.toThrow("Error deleting note: Forbidden");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to delete note:",
        "Forbidden"
      );
      consoleSpy.mockRestore();
    });

    it("should handle network errors", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const networkError = new Error("Network error");
      (global.fetch as any).mockRejectedValue(networkError);

      await expect(
        noteAPI.deleteNote("test-chat-1", "test-note")
      ).rejects.toThrow("Network error");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to delete note:",
        networkError
      );
      consoleSpy.mockRestore();
    });

    it("should handle unknown errors", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (global.fetch as any).mockRejectedValue("String error");

      await expect(
        noteAPI.deleteNote("test-chat-1", "test-note")
      ).rejects.toThrow("Unknown error occurred while deleting note");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to delete note:",
        "String error"
      );
      consoleSpy.mockRestore();
    });
  });

  describe("encryption/decryption", () => {
    it("should encrypt content before saving", async () => {
      const mockResponse = { ok: true };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await noteAPI.saveNote("test-chat-1", "test-note", "Secret content");

      expect(mockEncryptionManager.encryptString).toHaveBeenCalledWith(
        "test-chat-key",
        "Secret content"
      );
    });

    it("should decrypt content after loading", async () => {
      const mockResponse = {
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue({ content: "encrypted_Secret content" }),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await noteAPI.getNote("test-chat-1", "test-note");

      expect(mockEncryptionManager.decryptString).toHaveBeenCalledWith(
        "test-chat-key",
        "encrypted_Secret content"
      );
      expect(result).toBe("Secret content");
    });
  });
});
