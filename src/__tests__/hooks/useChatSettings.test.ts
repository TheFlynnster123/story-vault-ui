import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatSettings } from "../../hooks/useChatSettings";
import { useNoteAPI } from "../../hooks/useNoteAPI";
import { ChatSettingsNote } from "../../models/ChatSettingsNote";

// Mock the useNoteAPI hook
vi.mock("../../hooks/useNoteAPI");

// Mock the ChatSettingsNote class
vi.mock("../../models/ChatSettingsNote");

describe("useChatSettings", () => {
  const mockNoteAPI = {
    saveNote: vi.fn(),
    getNote: vi.fn(),
    deleteNote: vi.fn(),
  };

  const mockChatSettingsNote = {
    load: vi.fn(),
    save: vi.fn(),
    getChatTitle: vi.fn(),
    getContext: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockChatSettingsNote.load.mockResolvedValue(undefined);
    mockChatSettingsNote.save.mockResolvedValue(undefined);
    mockChatSettingsNote.getChatTitle.mockReturnValue("");
    mockChatSettingsNote.getContext.mockReturnValue("");
    (useNoteAPI as any).mockReturnValue(mockNoteAPI);
    (ChatSettingsNote as any).mockImplementation(() => mockChatSettingsNote);
  });

  describe("loadChatSettings", () => {
    it("should load and cache chat settings", async () => {
      mockChatSettingsNote.getChatTitle.mockReturnValue("Test Story");
      mockChatSettingsNote.getContext.mockReturnValue("Test context");

      const { result } = renderHook(() => useChatSettings());

      let settings;
      await act(async () => {
        settings = await result.current.loadChatSettings("test-chat-id");
      });

      expect(settings).toEqual({
        chatTitle: "Test Story",
        context: "Test context",
      });
      expect(mockChatSettingsNote.load).toHaveBeenCalled();
    });

    it("should return cached settings on subsequent calls", async () => {
      mockChatSettingsNote.getChatTitle.mockReturnValue("Test Story");
      mockChatSettingsNote.getContext.mockReturnValue("Test context");

      const { result } = renderHook(() => useChatSettings());

      // First call
      await act(async () => {
        await result.current.loadChatSettings("test-chat-id");
      });

      // Second call should use cache
      await act(async () => {
        await result.current.loadChatSettings("test-chat-id");
      });

      expect(mockChatSettingsNote.load).toHaveBeenCalledTimes(1);
    });

    it("should handle loading errors gracefully", async () => {
      mockChatSettingsNote.load.mockRejectedValue(new Error("Load failed"));

      const { result } = renderHook(() => useChatSettings());

      let settings;
      await act(async () => {
        settings = await result.current.loadChatSettings("test-chat-id");
      });

      expect(settings).toBeNull();
    });

    it("should return null when noteAPI is not available", async () => {
      (useNoteAPI as any).mockReturnValue(null);

      const { result } = renderHook(() => useChatSettings());

      let settings;
      await act(async () => {
        settings = await result.current.loadChatSettings("test-chat-id");
      });

      expect(settings).toBeNull();
    });
  });

  describe("createChatSettings", () => {
    it("should create and save chat settings", async () => {
      const { result } = renderHook(() => useChatSettings());

      const testSettings = {
        chatTitle: "New Story",
        context: "New context",
      };

      await act(async () => {
        await result.current.createChatSettings("test-chat-id", testSettings);
      });

      expect(ChatSettingsNote).toHaveBeenCalledWith(
        "test-chat-id",
        mockNoteAPI,
        testSettings
      );
      expect(mockChatSettingsNote.save).toHaveBeenCalled();
    });

    it("should throw error when noteAPI is not available", async () => {
      (useNoteAPI as any).mockReturnValue(null);

      const { result } = renderHook(() => useChatSettings());

      const testSettings = {
        chatTitle: "New Story",
        context: "New context",
      };

      await act(async () => {
        await expect(
          result.current.createChatSettings("test-chat-id", testSettings)
        ).rejects.toThrow("NoteAPI or chatId not available");
      });
    });

    it("should handle save errors", async () => {
      mockChatSettingsNote.save.mockRejectedValue(new Error("Save failed"));

      const { result } = renderHook(() => useChatSettings());

      const testSettings = {
        chatTitle: "New Story",
        context: "New context",
      };

      await act(async () => {
        await expect(
          result.current.createChatSettings("test-chat-id", testSettings)
        ).rejects.toThrow("Save failed");
      });
    });
  });

  describe("getChatTitle", () => {
    it("should return chat title when settings exist", async () => {
      // Reset mocks to ensure clean state
      vi.clearAllMocks();
      mockChatSettingsNote.load.mockResolvedValue(undefined);
      mockChatSettingsNote.getChatTitle.mockReturnValue("Test Story");
      mockChatSettingsNote.getContext.mockReturnValue("Test context");

      const { result } = renderHook(() => useChatSettings());

      // Load settings first
      await act(async () => {
        await result.current.loadChatSettings("test-chat-id");
      });

      const title = result.current.getChatTitle("test-chat-id");
      expect(title).toBe("Test Story");
    });

    it("should return chatId when no settings exist", () => {
      const { result } = renderHook(() => useChatSettings());

      const title = result.current.getChatTitle("test-chat-id");
      expect(title).toBe("test-chat-id");
    });

    it("should return chatId when settings have no title", async () => {
      mockChatSettingsNote.getChatTitle.mockReturnValue("");
      mockChatSettingsNote.getContext.mockReturnValue("Test context");

      const { result } = renderHook(() => useChatSettings());

      // Load settings first
      await act(async () => {
        await result.current.loadChatSettings("test-chat-id");
      });

      const title = result.current.getChatTitle("test-chat-id");
      expect(title).toBe("test-chat-id");
    });
  });

  describe("isLoading", () => {
    it("should track loading state during operations", async () => {
      let resolveLoad: () => void;
      const loadPromise = new Promise<void>((resolve) => {
        resolveLoad = resolve;
      });
      mockChatSettingsNote.load.mockReturnValue(loadPromise);

      const { result } = renderHook(() => useChatSettings());

      expect(result.current.isLoading).toBe(false);

      // Start loading
      act(() => {
        result.current.loadChatSettings("test-chat-id");
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Complete loading
      act(() => {
        resolveLoad!();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
