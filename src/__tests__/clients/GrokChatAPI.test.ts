import { describe, it, expect, vi, beforeEach } from "vitest";
import { GrokChatAPI } from "../../clients/GrokChatAPI";
import type { EncryptionManager } from "../../Managers/EncryptionManager";
import type { Message } from "../../Chat/ChatMessage";

// Mock Config
vi.mock("../../Config", () => ({
  default: {
    storyVaultAPIURL: "https://test-api.com",
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("GrokChatAPI", () => {
  let mockEncryptionManager: EncryptionManager;
  let grokChatAPI: GrokChatAPI;
  const mockAccessToken = "test-access-token";

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock EncryptionManager
    mockEncryptionManager = {
      grokEncryptionKey: "test-encryption-key",
    } as EncryptionManager;

    grokChatAPI = new GrokChatAPI(mockEncryptionManager, mockAccessToken);
  });

  describe("constructor", () => {
    it("should initialize with valid parameters", () => {
      expect(grokChatAPI).toBeInstanceOf(GrokChatAPI);
      // Blob: encryptionManager and accessToken are now protected properties from BaseAPIClient
      expect(grokChatAPI).toBeDefined();
    });

    it("should throw error when access token is missing", () => {
      expect(() => {
        new GrokChatAPI(mockEncryptionManager, "");
      }).toThrow("Access token is required for GrokChatAPI.");
    });

    it("should throw error when encryption manager is missing", () => {
      expect(() => {
        new GrokChatAPI(null as any, mockAccessToken);
      }).toThrow("EncryptionManager not found in grok chat api!");
    });
  });

  describe("postChat", () => {
    const mockMessages: Message[] = [
      { id: "1", role: "user", content: "Hello" },
      { id: "2", role: "assistant", content: "Hi there!" },
    ];

    it("should successfully post chat messages", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ reply: "Test response" }),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await grokChatAPI.postChat(mockMessages);

      expect(result).toBe("Test response");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/PostChat",
        {
          method: "POST",
          headers: {
            EncryptionKey: "test-encryption-key",
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({ messages: mockMessages }),
        }
      );
    });

    it("should include reasoning header when provided", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ reply: "Test response" }),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await grokChatAPI.postChat(mockMessages, "high");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/PostChat",
        {
          method: "POST",
          headers: {
            EncryptionKey: "test-encryption-key",
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
            Reasoning: "high",
          },
          body: JSON.stringify({ messages: mockMessages }),
        }
      );
    });

    it("should handle low reasoning parameter", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ reply: "Test response" }),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await grokChatAPI.postChat(mockMessages, "low");

      const callArgs = (global.fetch as any).mock.calls[0][1];
      expect(callArgs.headers.Reasoning).toBe("low");
    });

    it("should handle API error responses", async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: "Bad Request",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(grokChatAPI.postChat(mockMessages)).rejects.toThrow(
        "API request failed: 400 Bad Request"
      );
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      (global.fetch as any).mockRejectedValue(networkError);

      await expect(grokChatAPI.postChat(mockMessages)).rejects.toThrow(
        "Network error"
      );
    });

    it("should handle non-Error exceptions", async () => {
      (global.fetch as any).mockRejectedValue("String error");

      await expect(grokChatAPI.postChat(mockMessages)).rejects.toThrow(
        "Network error: Unknown error"
      );
    });

    it("should handle JSON parsing errors", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(grokChatAPI.postChat(mockMessages)).rejects.toThrow(
        "Invalid JSON"
      );
    });
  });

  describe("request building", () => {
    it("should build request with empty messages array", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ reply: "Empty response" }),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await grokChatAPI.postChat([]);

      const callArgs = (global.fetch as any).mock.calls[0][1];
      expect(callArgs.body).toBe(JSON.stringify({ messages: [] }));
    });

    it("should handle missing encryption key", async () => {
      const managerWithoutKey = {
        grokEncryptionKey: undefined,
      } as EncryptionManager;

      const apiWithoutKey = new GrokChatAPI(managerWithoutKey, mockAccessToken);

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ reply: "Test" }),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await apiWithoutKey.postChat([]);

      const callArgs = (global.fetch as any).mock.calls[0][1];
      expect(callArgs.headers.EncryptionKey).toBeUndefined();
    });
  });
});
