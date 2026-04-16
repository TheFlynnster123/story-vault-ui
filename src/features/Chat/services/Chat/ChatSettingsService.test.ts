import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ChatSettingsService } from "./ChatSettingsService";
import type { ChatSettings } from "./ChatSettings";
import { d } from "../../../../services/Dependencies";

vi.mock("../../../../services/Dependencies");

const CHAT_ID = "test-chat-123";

const createMockSettings = (
  overrides?: Partial<ChatSettings>,
): ChatSettings => ({
  timestampCreatedUtcMs: Date.now(),
  chatTitle: "Test Chat",
  prompt: "Test prompt",
  ...overrides,
});

describe("ChatSettingsService", () => {
  let mockManagedBlob: any;

  beforeEach(() => {
    mockManagedBlob = {
      get: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
      saveDebounced: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(d.ChatSettingsManagedBlob).mockReturnValue(mockManagedBlob);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("setMessageTransparency", () => {
    it("should save transparency value with debounce", async () => {
      const existingSettings = createMockSettings();
      mockManagedBlob.get.mockResolvedValue(existingSettings);

      const service = new ChatSettingsService(CHAT_ID);
      await service.setMessageTransparency(0.5);

      expect(mockManagedBlob.saveDebounced).toHaveBeenCalledWith({
        ...existingSettings,
        messageTransparency: 0.5,
      });
    });

    it("should preserve existing settings when saving transparency", async () => {
      const existingSettings = createMockSettings({
        chatTitle: "My Story",
        customPrompt: "Be creative",
        modelOverride: "openai/gpt-4",
      });
      mockManagedBlob.get.mockResolvedValue(existingSettings);

      const service = new ChatSettingsService(CHAT_ID);
      await service.setMessageTransparency(0.3);

      expect(mockManagedBlob.saveDebounced).toHaveBeenCalledWith({
        ...existingSettings,
        messageTransparency: 0.3,
      });
    });

    it("should not save when settings do not exist", async () => {
      mockManagedBlob.get.mockResolvedValue(undefined);

      const service = new ChatSettingsService(CHAT_ID);
      await service.setMessageTransparency(0.5);

      expect(mockManagedBlob.saveDebounced).not.toHaveBeenCalled();
    });

    it("should handle zero transparency", async () => {
      const existingSettings = createMockSettings();
      mockManagedBlob.get.mockResolvedValue(existingSettings);

      const service = new ChatSettingsService(CHAT_ID);
      await service.setMessageTransparency(0);

      expect(mockManagedBlob.saveDebounced).toHaveBeenCalledWith({
        ...existingSettings,
        messageTransparency: 0,
      });
    });

    it("should handle full transparency", async () => {
      const existingSettings = createMockSettings();
      mockManagedBlob.get.mockResolvedValue(existingSettings);

      const service = new ChatSettingsService(CHAT_ID);
      await service.setMessageTransparency(1);

      expect(mockManagedBlob.saveDebounced).toHaveBeenCalledWith({
        ...existingSettings,
        messageTransparency: 1,
      });
    });

    it("should overwrite existing transparency value", async () => {
      const existingSettings = createMockSettings({
        messageTransparency: 0.8,
      });
      mockManagedBlob.get.mockResolvedValue(existingSettings);

      const service = new ChatSettingsService(CHAT_ID);
      await service.setMessageTransparency(0.2);

      expect(mockManagedBlob.saveDebounced).toHaveBeenCalledWith({
        ...existingSettings,
        messageTransparency: 0.2,
      });
    });
  });
});
