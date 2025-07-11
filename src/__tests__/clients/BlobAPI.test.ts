import { describe, it, expect, vi, beforeEach } from "vitest";
import { BlobAPI } from "../../clients/BlobAPI";
import type { EncryptionManager } from "../../Managers/EncryptionManager";

// Mock Config
vi.mock("../../Config", () => ({
  default: {
    storyVaultAPIURL: "https://test-api.com",
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("BlobAPI", () => {
  let mockEncryptionManager: EncryptionManager;
  let blobAPI: BlobAPI;
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

    blobAPI = new BlobAPI(mockEncryptionManager, mockAccessToken);
  });

  describe("constructor", () => {
    it("should initialize with valid parameters", () => {
      expect(blobAPI).toBeInstanceOf(BlobAPI);
      expect(blobAPI.encryptionManager).toBe(mockEncryptionManager);
      expect(blobAPI.accessToken).toBe(mockAccessToken);
      expect(blobAPI.URL).toBe("https://test-api.com");
    });

    it("should throw error when access token is missing", () => {
      expect(() => {
        new BlobAPI(mockEncryptionManager, "");
      }).toThrow("Access token is required");
    });
  });

  describe("saveBlob", () => {
    it("should successfully save a blob", async () => {
      const mockResponse = {
        ok: true,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await blobAPI.saveBlob(
        "test-chat-1",
        "test-blob",
        "Blob content"
      );

      expect(result).toBe(true);
      expect(mockEncryptionManager.encryptString).toHaveBeenCalledWith(
        "test-chat-key",
        "Blob content"
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/SaveBlob",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({
            chatId: "test-chat-1",
            blobName: "test-blob",
            content: "encrypted_Blob content",
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
        blobAPI.saveBlob("test-chat-1", "test-blob", "Blob content")
      ).rejects.toThrow("Invalid input: Bad Request");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Invalid input for save blob:",
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
        blobAPI.saveBlob("test-chat-1", "test-blob", "Blob content")
      ).rejects.toThrow("Unauthorized: Unauthorized");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Unauthorized access for save blob:",
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
        blobAPI.saveBlob("test-chat-1", "test-blob", "Blob content")
      ).rejects.toThrow("Server error: Internal Server Error");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Server error for save blob:",
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
        blobAPI.saveBlob("test-chat-1", "test-blob", "Blob content")
      ).rejects.toThrow("Error saving blob: Forbidden");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save blob:",
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
        blobAPI.saveBlob("test-chat-1", "test-blob", "Blob content")
      ).rejects.toThrow("Network error");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save blob:",
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
        blobAPI.saveBlob("test-chat-1", "test-blob", "Blob content")
      ).rejects.toThrow("Unknown error occurred while saving blob");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save blob:",
        "String error"
      );
      consoleSpy.mockRestore();
    });
  });

  describe("getBlob", () => {
    it("should successfully get a blob", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ content: "encrypted_Blob content" }),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await blobAPI.getBlob("test-chat-1", "test-blob");

      expect(result).toBe("Blob content");
      expect(mockEncryptionManager.decryptString).toHaveBeenCalledWith(
        "test-chat-key",
        "encrypted_Blob content"
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/GetBlob",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({
            chatId: "test-chat-1",
            blobName: "test-blob",
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

      const result = await blobAPI.getBlob("test-chat-1", "nonexistent-blob");

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

      await expect(blobAPI.getBlob("test-chat-1", "test-blob")).rejects.toThrow(
        "Invalid input: Bad Request"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Invalid input for get blob:",
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

      await expect(blobAPI.getBlob("test-chat-1", "test-blob")).rejects.toThrow(
        "Unauthorized: Unauthorized"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Unauthorized access for get blob:",
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

      await expect(blobAPI.getBlob("test-chat-1", "test-blob")).rejects.toThrow(
        "Server error: Internal Server Error"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Server error for get blob:",
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

      await expect(blobAPI.getBlob("test-chat-1", "test-blob")).rejects.toThrow(
        "Error fetching blob: Forbidden"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get blob:",
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

      await expect(blobAPI.getBlob("test-chat-1", "test-blob")).rejects.toThrow(
        "Network error"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get blob:",
        networkError
      );
      consoleSpy.mockRestore();
    });

    it("should handle unknown errors", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (global.fetch as any).mockRejectedValue("String error");

      await expect(blobAPI.getBlob("test-chat-1", "test-blob")).rejects.toThrow(
        "Unknown error occurred while fetching blob"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get blob:",
        "String error"
      );
      consoleSpy.mockRestore();
    });
  });

  describe("deleteBlob", () => {
    it("should successfully delete a blob", async () => {
      const mockResponse = {
        ok: true,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await blobAPI.deleteBlob("test-chat-1", "test-blob");

      expect(result).toBe(true);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/DeleteBlob",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({
            chatId: "test-chat-1",
            blobName: "test-blob",
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
        blobAPI.deleteBlob("test-chat-1", "test-blob")
      ).rejects.toThrow("Invalid input: Bad Request");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Invalid input for delete blob:",
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
        blobAPI.deleteBlob("test-chat-1", "test-blob")
      ).rejects.toThrow("Unauthorized: Unauthorized");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Unauthorized access for delete blob:",
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
        blobAPI.deleteBlob("test-chat-1", "test-blob")
      ).rejects.toThrow("Server error: Internal Server Error");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Server error for delete blob:",
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
        blobAPI.deleteBlob("test-chat-1", "test-blob")
      ).rejects.toThrow("Error deleting blob: Forbidden");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to delete blob:",
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
        blobAPI.deleteBlob("test-chat-1", "test-blob")
      ).rejects.toThrow("Network error");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to delete blob:",
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
        blobAPI.deleteBlob("test-chat-1", "test-blob")
      ).rejects.toThrow("Unknown error occurred while deleting blob");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to delete blob:",
        "String error"
      );
      consoleSpy.mockRestore();
    });
  });

  describe("encryption/decryption", () => {
    it("should encrypt content before saving", async () => {
      const mockResponse = { ok: true };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await blobAPI.saveBlob("test-chat-1", "test-blob", "Secret content");

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

      const result = await blobAPI.getBlob("test-chat-1", "test-blob");

      expect(mockEncryptionManager.decryptString).toHaveBeenCalledWith(
        "test-chat-key",
        "encrypted_Secret content"
      );
      expect(result).toBe("Secret content");
    });
  });
});
