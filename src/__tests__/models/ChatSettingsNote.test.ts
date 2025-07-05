import {
  ChatSettingsNote,
  type ChatSettings,
} from "../../models/ChatSettingsNote";
import { NoteAPI } from "../../clients/NoteAPI";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock the NoteAPI
vi.mock("../../clients/NoteAPI");
const MockedNoteAPI = NoteAPI as any;

describe("ChatSettingsNote", () => {
  let mockNoteAPI: any;
  let chatSettingsNote: ChatSettingsNote;
  const testChatId = "test-chat-id";

  beforeEach(() => {
    mockNoteAPI = {
      saveNote: vi.fn(),
      getNote: vi.fn(),
      deleteNote: vi.fn(),
    };
    chatSettingsNote = new ChatSettingsNote(testChatId, mockNoteAPI);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with empty settings by default", () => {
      expect(chatSettingsNote.chatId).toBe(testChatId);
      expect(chatSettingsNote.noteName).toBe("chat-settings");
      expect(chatSettingsNote.getSettings()).toEqual({
        chatTitle: "",
        context: "",
      });
    });

    it("should create instance with provided settings", () => {
      const settings: ChatSettings = {
        chatTitle: "Test Story",
        context: "Test context",
      };
      const noteWithSettings = new ChatSettingsNote(
        testChatId,
        mockNoteAPI,
        settings
      );

      expect(noteWithSettings.getSettings()).toEqual(settings);
    });
  });

  describe("getSettings", () => {
    it("should return empty settings when content is empty", () => {
      const settings = chatSettingsNote.getSettings();
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
      chatSettingsNote.content = JSON.stringify(testSettings);

      const settings = chatSettingsNote.getSettings();
      expect(settings).toEqual(testSettings);
    });

    it("should return empty settings when JSON parsing fails", () => {
      chatSettingsNote.content = "invalid json";
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const settings = chatSettingsNote.getSettings();
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

      chatSettingsNote.setSettings(testSettings);

      expect(chatSettingsNote.content).toBe(JSON.stringify(testSettings));
      expect(chatSettingsNote.getSettings()).toEqual(testSettings);
    });
  });

  describe("getChatTitle", () => {
    it("should return story title from settings", () => {
      const testSettings: ChatSettings = {
        chatTitle: "Epic Tale",
        context: "Context here",
      };
      chatSettingsNote.setSettings(testSettings);

      expect(chatSettingsNote.getChatTitle()).toBe("Epic Tale");
    });
  });

  describe("getContext", () => {
    it("should return context from settings", () => {
      const testSettings: ChatSettings = {
        chatTitle: "Title here",
        context: "Amazing context",
      };
      chatSettingsNote.setSettings(testSettings);

      expect(chatSettingsNote.getContext()).toBe("Amazing context");
    });
  });

  describe("setChatTitle", () => {
    it("should update only the story title", () => {
      const initialSettings: ChatSettings = {
        chatTitle: "Old Title",
        context: "Existing context",
      };
      chatSettingsNote.setSettings(initialSettings);

      chatSettingsNote.setChatTitle("New Title");

      const updatedSettings = chatSettingsNote.getSettings();
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
      chatSettingsNote.setSettings(initialSettings);

      chatSettingsNote.setContext("New context");

      const updatedSettings = chatSettingsNote.getSettings();
      expect(updatedSettings.chatTitle).toBe("Existing title");
      expect(updatedSettings.context).toBe("New context");
    });
  });

  describe("hasSettings", () => {
    it("should return false when both title and context are empty", () => {
      expect(chatSettingsNote.hasSettings()).toBe(false);
    });

    it("should return true when story title is provided", () => {
      chatSettingsNote.setChatTitle("Some title");
      expect(chatSettingsNote.hasSettings()).toBe(true);
    });

    it("should return true when context is provided", () => {
      chatSettingsNote.setContext("Some context");
      expect(chatSettingsNote.hasSettings()).toBe(true);
    });

    it("should return false when only whitespace is provided", () => {
      chatSettingsNote.setChatTitle("   ");
      chatSettingsNote.setContext("   ");
      expect(chatSettingsNote.hasSettings()).toBe(false);
    });
  });

  describe("save", () => {
    it("should call noteAPI.saveNote with correct parameters", async () => {
      const testSettings: ChatSettings = {
        chatTitle: "Test Title",
        context: "Test Context",
      };
      chatSettingsNote.setSettings(testSettings);
      mockNoteAPI.saveNote.mockResolvedValue(true);

      await chatSettingsNote.save();

      expect(mockNoteAPI.saveNote).toHaveBeenCalledWith(
        testChatId,
        "chat-settings",
        JSON.stringify(testSettings)
      );
    });

    it("should propagate errors from noteAPI", async () => {
      const error = new Error("Save failed");
      mockNoteAPI.saveNote.mockRejectedValue(error);

      await expect(chatSettingsNote.save()).rejects.toThrow("Save failed");
    });
  });

  describe("load", () => {
    it("should load content from noteAPI", async () => {
      const testSettings: ChatSettings = {
        chatTitle: "Loaded Title",
        context: "Loaded Context",
      };
      const serializedSettings = JSON.stringify(testSettings);
      mockNoteAPI.getNote.mockResolvedValue(serializedSettings);

      await chatSettingsNote.load();

      expect(mockNoteAPI.getNote).toHaveBeenCalledWith(
        testChatId,
        "chat-settings"
      );
      expect(chatSettingsNote.content).toBe(serializedSettings);
      expect(chatSettingsNote.getSettings()).toEqual(testSettings);
    });

    it("should handle when no content is returned", async () => {
      mockNoteAPI.getNote.mockResolvedValue(undefined);

      await chatSettingsNote.load();

      expect(chatSettingsNote.content).toBe("");
    });

    it("should propagate errors from noteAPI", async () => {
      const error = new Error("Load failed");
      mockNoteAPI.getNote.mockRejectedValue(error);

      await expect(chatSettingsNote.load()).rejects.toThrow("Load failed");
    });
  });

  describe("delete", () => {
    it("should call noteAPI.deleteNote and clear content", async () => {
      chatSettingsNote.setChatTitle("Some title");
      mockNoteAPI.deleteNote.mockResolvedValue(true);

      await chatSettingsNote.delete();

      expect(mockNoteAPI.deleteNote).toHaveBeenCalledWith(
        testChatId,
        "chat-settings"
      );
      expect(chatSettingsNote.content).toBe("");
    });

    it("should propagate errors from noteAPI", async () => {
      const error = new Error("Delete failed");
      mockNoteAPI.deleteNote.mockRejectedValue(error);

      await expect(chatSettingsNote.delete()).rejects.toThrow("Delete failed");
    });
  });
});
