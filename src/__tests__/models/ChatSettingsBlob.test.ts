import {
  ChatSettingsBlob,
  type ChatSettings,
} from "../../models/ChatSettingsBlob";
import { BlobAPI } from "../../clients/BlobAPI";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock the BlobAPI
vi.mock("../../clients/BlobAPI");
const MockedBlobAPI = BlobAPI as any;

describe("ChatSettingsBlob", () => {
  let mockBlobAPI: any;
  let chatSettingsBlob: ChatSettingsBlob;
  const testChatId = "test-chat-id";

  beforeEach(() => {
    mockBlobAPI = {
      saveBlob: vi.fn(),
      getBlob: vi.fn(),
      deleteBlob: vi.fn(),
    };
    chatSettingsBlob = new ChatSettingsBlob(testChatId, mockBlobAPI);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with empty settings by default", () => {
      expect(chatSettingsBlob.chatId).toBe(testChatId);
      expect(chatSettingsBlob.blobName).toBe("chat-settings");
      expect(chatSettingsBlob.getSettings()).toEqual({
        chatTitle: "",
        context: "",
      });
    });

    it("should create instance with provided settings", () => {
      const settings: ChatSettings = {
        chatTitle: "Test Story",
        context: "Test context",
      };
      const blobWithSettings = new ChatSettingsBlob(
        testChatId,
        mockBlobAPI,
        settings
      );

      expect(blobWithSettings.getSettings()).toEqual(settings);
    });
  });

  describe("getSettings", () => {
    it("should return empty settings when content is empty", () => {
      const settings = chatSettingsBlob.getSettings();
      expect(settings).toEqual({
        chatTitle: "",
        context: "",
      });
    });

    it("should parse JSON content correctly", () => {
      const testSettings: ChatSettings = {
        chatTitle: "My Story",
        context: "A fantasy adventure",
      };
      chatSettingsBlob.content = JSON.stringify(testSettings);

      const settings = chatSettingsBlob.getSettings();
      expect(settings).toEqual(testSettings);
    });

    it("should return empty settings when JSON parsing fails", () => {
      chatSettingsBlob.content = "invalid json";
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const settings = chatSettingsBlob.getSettings();
      expect(settings).toEqual({
        chatTitle: "",
        context: "",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to parse chat settings:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("setSettings", () => {
    it("should set settings and update content", () => {
      const testSettings: ChatSettings = {
        chatTitle: "New Story",
        context: "New context",
      };

      chatSettingsBlob.setSettings(testSettings);

      expect(chatSettingsBlob.content).toBe(JSON.stringify(testSettings));
      expect(chatSettingsBlob.getSettings()).toEqual(testSettings);
    });
  });

  describe("getChatTitle", () => {
    it("should return story title from settings", () => {
      const testSettings: ChatSettings = {
        chatTitle: "Epic Tale",
        context: "Context here",
      };
      chatSettingsBlob.setSettings(testSettings);

      expect(chatSettingsBlob.getChatTitle()).toBe("Epic Tale");
    });
  });

  describe("getContext", () => {
    it("should return context from settings", () => {
      const testSettings: ChatSettings = {
        chatTitle: "Title here",
        context: "Amazing context",
      };
      chatSettingsBlob.setSettings(testSettings);

      expect(chatSettingsBlob.getContext()).toBe("Amazing context");
    });
  });

  describe("setChatTitle", () => {
    it("should update only the story title", () => {
      const initialSettings: ChatSettings = {
        chatTitle: "Old Title",
        context: "Existing context",
      };
      chatSettingsBlob.setSettings(initialSettings);

      chatSettingsBlob.setChatTitle("New Title");

      const updatedSettings = chatSettingsBlob.getSettings();
      expect(updatedSettings.chatTitle).toBe("New Title");
      expect(updatedSettings.context).toBe("Existing context");
    });
  });

  describe("setContext", () => {
    it("should update only the context", () => {
      const initialSettings: ChatSettings = {
        chatTitle: "Existing title",
        context: "Old context",
      };
      chatSettingsBlob.setSettings(initialSettings);

      chatSettingsBlob.setContext("New context");

      const updatedSettings = chatSettingsBlob.getSettings();
      expect(updatedSettings.chatTitle).toBe("Existing title");
      expect(updatedSettings.context).toBe("New context");
    });
  });

  describe("hasSettings", () => {
    it("should return false when both title and context are empty", () => {
      expect(chatSettingsBlob.hasSettings()).toBe(false);
    });

    it("should return true when story title is provided", () => {
      chatSettingsBlob.setChatTitle("Some title");
      expect(chatSettingsBlob.hasSettings()).toBe(true);
    });

    it("should return true when context is provided", () => {
      chatSettingsBlob.setContext("Some context");
      expect(chatSettingsBlob.hasSettings()).toBe(true);
    });

    it("should return false when only whitespace is provided", () => {
      chatSettingsBlob.setChatTitle("   ");
      chatSettingsBlob.setContext("   ");
      expect(chatSettingsBlob.hasSettings()).toBe(false);
    });
  });

  describe("save", () => {
    it("should call blobAPI.saveBlob with correct parameters", async () => {
      const testSettings: ChatSettings = {
        chatTitle: "Test Title",
        context: "Test Context",
      };
      chatSettingsBlob.setSettings(testSettings);
      mockBlobAPI.saveBlob.mockResolvedValue(true);

      await chatSettingsBlob.save();

      expect(mockBlobAPI.saveBlob).toHaveBeenCalledWith(
        testChatId,
        "chat-settings",
        JSON.stringify(testSettings)
      );
    });

    it("should propagate errors from blobAPI", async () => {
      const error = new Error("Save failed");
      mockBlobAPI.saveBlob.mockRejectedValue(error);

      await expect(chatSettingsBlob.save()).rejects.toThrow("Save failed");
    });
  });

  describe("load", () => {
    it("should load content from blobAPI", async () => {
      const testSettings: ChatSettings = {
        chatTitle: "Loaded Title",
        context: "Loaded Context",
      };
      const serializedSettings = JSON.stringify(testSettings);
      mockBlobAPI.getBlob.mockResolvedValue(serializedSettings);

      await chatSettingsBlob.load();

      expect(mockBlobAPI.getBlob).toHaveBeenCalledWith(
        testChatId,
        "chat-settings"
      );
      expect(chatSettingsBlob.content).toBe(serializedSettings);
      expect(chatSettingsBlob.getSettings()).toEqual(testSettings);
    });

    it("should handle when no content is returned", async () => {
      mockBlobAPI.getBlob.mockResolvedValue(undefined);

      await chatSettingsBlob.load();

      expect(chatSettingsBlob.content).toBe("");
    });

    it("should propagate errors from blobAPI", async () => {
      const error = new Error("Load failed");
      mockBlobAPI.getBlob.mockRejectedValue(error);

      await expect(chatSettingsBlob.load()).rejects.toThrow("Load failed");
    });
  });

  describe("delete", () => {
    it("should call blobAPI.deleteBlob and clear content", async () => {
      chatSettingsBlob.setChatTitle("Some title");
      mockBlobAPI.deleteBlob.mockResolvedValue(true);

      await chatSettingsBlob.delete();

      expect(mockBlobAPI.deleteBlob).toHaveBeenCalledWith(
        testChatId,
        "chat-settings"
      );
      expect(chatSettingsBlob.content).toBe("");
    });

    it("should propagate errors from blobAPI", async () => {
      const error = new Error("Delete failed");
      mockBlobAPI.deleteBlob.mockRejectedValue(error);

      await expect(chatSettingsBlob.delete()).rejects.toThrow("Delete failed");
    });
  });
});
