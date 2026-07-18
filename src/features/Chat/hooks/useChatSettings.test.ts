import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { d } from "../../../services/Dependencies";
import { Theme } from "../../../components/Theme";

vi.mock("../../../services/Dependencies");

// Mock useCivitJob — returns no photo by default
const mockUseCivitJob = vi.fn();
vi.mock("../../Images/hooks/useCivitJob", () => ({
  useCivitJob: (...args: unknown[]) => mockUseCivitJob(...args),
  useWorkflowImage: (...args: unknown[]) => mockUseCivitJob(...args),
}));

const CHAT_ID = "test-chat-456";

const createMockChatSettingsService = () => ({
  Get: vi.fn().mockResolvedValue(undefined),
  getCached: vi.fn().mockReturnValue(undefined),
  subscribe: vi.fn().mockReturnValue(vi.fn()),
  isLoading: vi.fn().mockReturnValue(false),
});

describe("useChatSettings", () => {
  let mockChatSettingsService: ReturnType<typeof createMockChatSettingsService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChatSettingsService = createMockChatSettingsService();
    vi.mocked(d.ChatSettingsService).mockReturnValue(
      mockChatSettingsService as unknown as ReturnType<
        typeof d.ChatSettingsService
      >,
    );
    mockUseCivitJob.mockReturnValue({ photoBase64: undefined });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Dynamic import so mocks are in place before module loads
  const importHook = async () => {
    const mod = await import("./useChatSettings");
    return mod.useChatSettings;
  };

  it("returns cached settings on the initial render", async () => {
    const cachedSettings = {
      timestampCreatedUtcMs: Date.now(),
      chatTitle: "Cached chat",
      prompt: "prompt",
      backgroundPhotoBase64: "data:image/png;base64,cached",
    };
    mockChatSettingsService.getCached.mockReturnValue(cachedSettings);
    mockChatSettingsService.Get.mockResolvedValue(cachedSettings);

    const useChatSettings = await importHook();
    const { result } = renderHook(() => useChatSettings(CHAT_ID));

    expect(result.current.chatSettings).toEqual(cachedSettings);
    expect(result.current.backgroundPhotoBase64).toBe(
      cachedSettings.backgroundPhotoBase64,
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("starts in a loading state when settings are not cached", async () => {
    mockChatSettingsService.isLoading.mockReturnValue(true);

    const useChatSettings = await importHook();
    const { result } = renderHook(() => useChatSettings(CHAT_ID));

    expect(result.current.chatSettings).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  describe("messageTransparency", () => {
    it("should default to theme transparency when setting is undefined", async () => {
      mockChatSettingsService.Get.mockResolvedValue({
        timestampCreatedUtcMs: Date.now(),
        chatTitle: "Test",
        prompt: "prompt",
      });

      const useChatSettings = await importHook();
      const { result } = renderHook(() => useChatSettings(CHAT_ID));

      await waitFor(() => {
        expect(result.current.messageTransparency).toBe(
          Theme.chatEntry.transparency,
        );
      });
    });

    it("should return saved messageTransparency value", async () => {
      mockChatSettingsService.Get.mockResolvedValue({
        timestampCreatedUtcMs: Date.now(),
        chatTitle: "Test",
        prompt: "prompt",
        messageTransparency: 0.4,
      });

      const useChatSettings = await importHook();
      const { result } = renderHook(() => useChatSettings(CHAT_ID));

      await waitFor(() => {
        expect(result.current.messageTransparency).toBe(0.4);
      });
    });

    it("should return theme default when settings are not loaded yet", async () => {
      mockChatSettingsService.Get.mockResolvedValue(undefined);

      const useChatSettings = await importHook();
      const { result } = renderHook(() => useChatSettings(CHAT_ID));

      expect(result.current.messageTransparency).toBe(
        Theme.chatEntry.transparency,
      );
    });

    it("should return zero transparency when saved as zero", async () => {
      mockChatSettingsService.Get.mockResolvedValue({
        timestampCreatedUtcMs: Date.now(),
        chatTitle: "Test",
        prompt: "prompt",
        messageTransparency: 0,
      });

      const useChatSettings = await importHook();
      const { result } = renderHook(() => useChatSettings(CHAT_ID));

      await waitFor(() => {
        expect(result.current.messageTransparency).toBe(0);
      });
    });
  });
});
