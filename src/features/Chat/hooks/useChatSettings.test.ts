import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { d } from "../../../services/Dependencies";
import { Theme } from "../../../components/Theme";

vi.mock("../../../services/Dependencies");

// Mock useCivitJob — returns no photo by default
const mockUseCivitJob = vi.fn();
vi.mock("../../Images/hooks/useCivitJob", () => ({
  useCivitJob: (...args: unknown[]) => mockUseCivitJob(...args),
}));

const CHAT_ID = "test-chat-456";

const createMockChatSettingsService = () => ({
  Get: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockReturnValue(vi.fn()),
  isLoading: vi.fn().mockReturnValue(false),
});

describe("useChatSettings", () => {
  let mockChatSettingsService: ReturnType<typeof createMockChatSettingsService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChatSettingsService = createMockChatSettingsService();
    vi.mocked(d.ChatSettingsService).mockReturnValue(
      mockChatSettingsService as any,
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
