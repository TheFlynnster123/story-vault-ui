import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatHistoryAPI } from "../../clients/ChatHistoryAPI";
import type { EncryptionManager } from "../../Managers/EncryptionManager";
import type { ChatPage } from "../../models/ChatPage";
import type { Message } from "../../Chat/ChatMessage";

// Mock Config
vi.mock("../../Config", () => ({
  default: {
    storyVaultAPIURL: "https://test-api.com",
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("ChatHistoryAPI", () => {
  let mockEncryptionManager: EncryptionManager;
  let chatHistoryAPI: ChatHistoryAPI;
  const mockAccessToken = "test-access-token";

  const mockMessages: Message[] = [
    { id: "1", role: "user", content: "Hello" },
    { id: "2", role: "assistant", content: "Hi there!" },
  ];

  const mockChatPage: ChatPage = {
    chatId: "test-chat-1",
    pageId: "page-1",
    messages: mockMessages,
  };

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

    chatHistoryAPI = new ChatHistoryAPI(mockEncryptionManager, mockAccessToken);
  });

  describe("constructor", () => {
    it("should initialize with valid parameters", () => {
      expect(chatHistoryAPI).toBeInstanceOf(ChatHistoryAPI);
      expect(chatHistoryAPI.encryptionManager).toBe(mockEncryptionManager);
      expect(chatHistoryAPI.accessToken).toBe(mockAccessToken);
      expect(chatHistoryAPI.URL).toBe("https://test-api.com");
    });
  });

  describe("saveChatPage", () => {
    it("should successfully save a chat page", async () => {
      const mockResponse = {
        ok: true,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await chatHistoryAPI.saveChatPage(mockChatPage);

      expect(result).toBe(true);
      expect(mockEncryptionManager.encryptString).toHaveBeenCalledTimes(2);
      expect(mockEncryptionManager.encryptString).toHaveBeenCalledWith(
        "test-chat-key",
        "Hello"
      );
      expect(mockEncryptionManager.encryptString).toHaveBeenCalledWith(
        "test-chat-key",
        "Hi there!"
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/SaveChatPage",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({
            chatId: "test-chat-1",
            pageId: "page-1",
            messages: [
              { id: "1", role: "user", content: "encrypted_Hello" },
              { id: "2", role: "assistant", content: "encrypted_Hi there!" },
            ],
          }),
        }
      );
    });

    it("should handle save failure", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        statusText: "Internal Server Error",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await chatHistoryAPI.saveChatPage(mockChatPage);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save chat page:",
        "Internal Server Error"
      );

      consoleSpy.mockRestore();
    });

    it("should handle network errors during save", async () => {
      const networkError = new Error("Network error");
      (global.fetch as any).mockRejectedValue(networkError);

      await expect(chatHistoryAPI.saveChatPage(mockChatPage)).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("getChatHistory", () => {
    it("should successfully get chat history", async () => {
      const mockEncryptedPages = [
        {
          chatId: "test-chat-1",
          pageId: "page-1",
          messages: [
            { id: "1", role: "user", content: "encrypted_Hello" },
            { id: "2", role: "assistant", content: "encrypted_Hi there!" },
          ],
        },
        {
          chatId: "test-chat-1",
          pageId: "page-2",
          messages: [
            { id: "3", role: "user", content: "encrypted_How are you?" },
          ],
        },
      ];

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockEncryptedPages),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await chatHistoryAPI.getChatHistory("test-chat-1");

      expect(result).toHaveLength(2);
      expect(result[0].messages[0].content).toBe("Hello");
      expect(result[0].messages[1].content).toBe("Hi there!");
      expect(result[1].messages[0].content).toBe("How are you?");

      expect(mockEncryptionManager.decryptString).toHaveBeenCalledTimes(3);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/GetChatHistory",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({ chatId: "test-chat-1" }),
        }
      );
    });

    it("should handle get chat history failure", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        statusText: "Not Found",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        chatHistoryAPI.getChatHistory("test-chat-1")
      ).rejects.toThrow("Error fetching chat history: Not Found");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get chat history:",
        "Not Found"
      );
      consoleSpy.mockRestore();
    });

    it("should handle network errors during get chat history", async () => {
      const networkError = new Error("Network error");
      (global.fetch as any).mockRejectedValue(networkError);

      await expect(
        chatHistoryAPI.getChatHistory("test-chat-1")
      ).rejects.toThrow("Network error");
    });
  });

  describe("getChatPage", () => {
    it("should successfully get a specific chat page", async () => {
      const mockEncryptedPage = {
        chatId: "test-chat-1",
        pageId: "page-1",
        messages: [
          { id: "1", role: "user", content: "encrypted_Hello" },
          { id: "2", role: "assistant", content: "encrypted_Hi there!" },
        ],
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockEncryptedPage),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await chatHistoryAPI.getChatPage("test-chat-1", "page-1");

      expect(result.chatId).toBe("test-chat-1");
      expect(result.pageId).toBe("page-1");
      expect(result.messages[0].content).toBe("Hello");
      expect(result.messages[1].content).toBe("Hi there!");

      expect(mockEncryptionManager.decryptString).toHaveBeenCalledTimes(2);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/GetChatPage",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
          body: JSON.stringify({ chatId: "test-chat-1", pageId: "page-1" }),
        }
      );
    });

    it("should handle get chat page failure", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        statusText: "Not Found",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(
        chatHistoryAPI.getChatPage("test-chat-1", "page-1")
      ).rejects.toThrow("Error fetching chat page: Not Found");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get chat page:",
        "Not Found"
      );
      consoleSpy.mockRestore();
    });

    it("should handle network errors during get chat page", async () => {
      const networkError = new Error("Network error");
      (global.fetch as any).mockRejectedValue(networkError);

      await expect(
        chatHistoryAPI.getChatPage("test-chat-1", "page-1")
      ).rejects.toThrow("Network error");
    });
  });

  describe("getChats", () => {
    it("should successfully get list of chats", async () => {
      const mockChats = ["chat-1", "chat-2", "chat-3"];

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockChats),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await chatHistoryAPI.getChats();

      expect(result).toEqual(mockChats);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-api.com/api/GetChats",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
        }
      );
    });

    it("should handle get chats failure", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockResponse = {
        ok: false,
        statusText: "Unauthorized",
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(chatHistoryAPI.getChats()).rejects.toThrow(
        "Error fetching chat page: Unauthorized"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get chats:",
        "Unauthorized"
      );
      consoleSpy.mockRestore();
    });

    it("should handle network errors during get chats", async () => {
      const networkError = new Error("Network error");
      (global.fetch as any).mockRejectedValue(networkError);

      await expect(chatHistoryAPI.getChats()).rejects.toThrow("Network error");
    });
  });

  describe("encryption/decryption", () => {
    it("should encrypt messages before saving", async () => {
      const mockResponse = { ok: true };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await chatHistoryAPI.saveChatPage(mockChatPage);

      expect(mockEncryptionManager.encryptString).toHaveBeenCalledWith(
        "test-chat-key",
        "Hello"
      );
      expect(mockEncryptionManager.encryptString).toHaveBeenCalledWith(
        "test-chat-key",
        "Hi there!"
      );
    });

    it("should decrypt messages after loading", async () => {
      const mockEncryptedPage = {
        chatId: "test-chat-1",
        pageId: "page-1",
        messages: [{ id: "1", role: "user", content: "encrypted_Hello" }],
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockEncryptedPage),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await chatHistoryAPI.getChatPage("test-chat-1", "page-1");

      expect(mockEncryptionManager.decryptString).toHaveBeenCalledWith(
        "test-chat-key",
        "encrypted_Hello"
      );
      expect(result.messages[0].content).toBe("Hello");
    });

    it("should handle empty message arrays", async () => {
      const emptyPage: ChatPage = {
        chatId: "test-chat-1",
        pageId: "page-1",
        messages: [],
      };

      const mockResponse = { ok: true };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await chatHistoryAPI.saveChatPage(emptyPage);

      expect(result).toBe(true);
      expect(mockEncryptionManager.encryptString).not.toHaveBeenCalled();
    });
  });
});
