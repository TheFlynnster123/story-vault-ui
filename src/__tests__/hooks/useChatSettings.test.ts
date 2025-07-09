import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatSettings } from "../../hooks/useChatSettings";
import { useBlobAPI } from "../../hooks/useBlobAPI";
import { ChatSettingsBlob } from "../../models/ChatSettingsBlob";

// Mock the useBlobAPI hook
vi.mock("../../hooks/useBlobAPI");

// Mock the ChatSettingsBlob class
vi.mock("../../models/ChatSettingsBlob");

describe("useChatSettings", () => {
  const mockBlobAPI = {
    saveBlob: vi.fn(),
    getBlob: vi.fn(),
    deleteBlob: vi.fn(),
  };

  const mockChatSettingsBlob = {
    load: vi.fn(),
    save: vi.fn(),
    getChatTitle: vi.fn(),
    getContext: vi.fn(),
    getBackgroundPhotoBase64: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockChatSettingsBlob.load.mockResolvedValue(undefined);
    mockChatSettingsBlob.save.mockResolvedValue(undefined);
    mockChatSettingsBlob.getChatTitle.mockReturnValue("");
    mockChatSettingsBlob.getContext.mockReturnValue("");
    mockChatSettingsBlob.getBackgroundPhotoBase64.mockReturnValue(undefined);
    (useBlobAPI as any).mockReturnValue(mockBlobAPI);
    (ChatSettingsBlob as any).mockImplementation(() => mockChatSettingsBlob);
  });

  describe("loadChatSettings", () => {
    it("should load and cache chat settings", async () => {
      mockChatSettingsBlob.getChatTitle.mockReturnValue("Test Story");
      mockChatSettingsBlob.getContext.mockReturnValue("Test context");

      const { result } = renderHook(() => useChatSettings());

      let settings;
      await act(async () => {
        settings = await result.current.loadChatSettings("test-chat-id");
      });

      expect(settings).toEqual({
        chatTitle: "Test Story",
        context: "Test context",
        backgroundPhotoBase64: undefined,
      });
      expect(mockChatSettingsBlob.load).toHaveBeenCalled();
    });

    it("should return cached settings on subsequent calls", async () => {
      mockChatSettingsBlob.getChatTitle.mockReturnValue("Test Story");
      mockChatSettingsBlob.getContext.mockReturnValue("Test context");

      const { result } = renderHook(() => useChatSettings());

      // First call
      await act(async () => {
        await result.current.loadChatSettings("test-chat-id");
      });

      // Second call should use cache
      await act(async () => {
        await result.current.loadChatSettings("test-chat-id");
      });

      expect(mockChatSettingsBlob.load).toHaveBeenCalledTimes(1);
    });

    it("should handle loading errors gracefully", async () => {
      mockChatSettingsBlob.load.mockRejectedValue(new Error("Load failed"));

      const { result } = renderHook(() => useChatSettings());

      let settings;
      await act(async () => {
        settings = await result.current.loadChatSettings("test-chat-id");
      });

      expect(settings).toBeNull();
    });

    it("should return null when blobAPI is not available", async () => {
      (useBlobAPI as any).mockReturnValue(null);

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
        backgroundPhotoBase64: undefined,
      };

      await act(async () => {
        await result.current.createChatSettings("test-chat-id", testSettings);
      });

      expect(ChatSettingsBlob).toHaveBeenCalledWith(
        "test-chat-id",
        mockBlobAPI,
        testSettings
      );
      expect(mockChatSettingsBlob.save).toHaveBeenCalled();
    });

    it("should throw error when blobAPI is not available", async () => {
      (useBlobAPI as any).mockReturnValue(null);

      const { result } = renderHook(() => useChatSettings());

      const testSettings = {
        chatTitle: "New Story",
        context: "New context",
        backgroundPhotoBase64: undefined,
      };

      await act(async () => {
        await expect(
          result.current.createChatSettings("test-chat-id", testSettings)
        ).rejects.toThrow("BlobAPI or chatId not available");
      });
    });

    it("should handle save errors", async () => {
      mockChatSettingsBlob.save.mockRejectedValue(new Error("Save failed"));

      const { result } = renderHook(() => useChatSettings());

      const testSettings = {
        chatTitle: "New Story",
        context: "New context",
        backgroundPhotoBase64: undefined,
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
      mockChatSettingsBlob.load.mockResolvedValue(undefined);
      mockChatSettingsBlob.getChatTitle.mockReturnValue("Test Story");
      mockChatSettingsBlob.getContext.mockReturnValue("Test context");

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
      mockChatSettingsBlob.getChatTitle.mockReturnValue("");
      mockChatSettingsBlob.getContext.mockReturnValue("Test context");

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
      mockChatSettingsBlob.load.mockReturnValue(loadPromise);

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
