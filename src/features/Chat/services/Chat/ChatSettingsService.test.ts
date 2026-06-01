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

  describe("partial updates", () => {
    it("should merge partial updates with existing settings when saving immediately", async () => {
      const existingSettings = createMockSettings({
        modelOverride: "openai/o4-mini",
        modelReasoningEffortOverride: "high",
        messageTransparency: 0.4,
      });
      mockManagedBlob.get.mockResolvedValue(existingSettings);

      const service = new ChatSettingsService(CHAT_ID);
      await service.update({ chatTitle: "Updated Title" });

      expect(mockManagedBlob.save).toHaveBeenCalledWith({
        ...existingSettings,
        chatTitle: "Updated Title",
      });
    });

    it("should merge partial updates with existing settings when saving debounced", async () => {
      const existingSettings = createMockSettings({
        modelOverride: "anthropic/claude-3",
        modelReasoningEffortOverride: "medium",
        messageTransparency: 0.2,
      });
      mockManagedBlob.get.mockResolvedValue(existingSettings);

      const service = new ChatSettingsService(CHAT_ID);
      await service.updateDebounced({ prompt: "Updated prompt" });

      expect(mockManagedBlob.saveDebounced).toHaveBeenCalledWith({
        ...existingSettings,
        prompt: "Updated prompt",
      });
    });

    it("should not save partial updates when settings do not exist", async () => {
      mockManagedBlob.get.mockResolvedValue(undefined);

      const service = new ChatSettingsService(CHAT_ID);
      await service.updateDebounced({ chatTitle: "Ignored" });

      expect(mockManagedBlob.save).not.toHaveBeenCalled();
      expect(mockManagedBlob.saveDebounced).not.toHaveBeenCalled();
    });
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

  describe("setModelOverride", () => {
    it("should save model override with request settings", async () => {
      const existingSettings = createMockSettings();
      mockManagedBlob.get.mockResolvedValue(existingSettings);

      const service = new ChatSettingsService(CHAT_ID);
      await service.setModelOverride("openai/o4-mini", {
        reasoning: { effort: "high" },
        temperature: 0.4,
      });

      expect(mockManagedBlob.save).toHaveBeenCalledWith({
        ...existingSettings,
        modelOverride: "openai/o4-mini",
        modelRequestSettingsOverride: {
          reasoning: { effort: "high" },
          temperature: 0.4,
        },
        modelReasoningEffortOverride: undefined,
      });
    });

    it("should clear reasoning effort when clearing model override", async () => {
      const existingSettings = createMockSettings({
        modelOverride: "openai/o4-mini",
        modelReasoningEffortOverride: "high",
      });
      mockManagedBlob.get.mockResolvedValue(existingSettings);

      const service = new ChatSettingsService(CHAT_ID);
      await service.setModelOverride(undefined);

      expect(mockManagedBlob.save).toHaveBeenCalledWith({
        ...existingSettings,
        modelOverride: undefined,
        modelRequestSettingsOverride: undefined,
        modelReasoningEffortOverride: undefined,
      });
    });

    describe("reasoning settings", () => {
      it("should save reasoning model override with request settings", async () => {
        const existingSettings = createMockSettings();
        mockManagedBlob.get.mockResolvedValue(existingSettings);

        const service = new ChatSettingsService(CHAT_ID);
        await service.setReasoningModelOverride("anthropic/claude-4-sonnet", {
          reasoning: { effort: "medium" },
          temperature: 0.3,
        });

        expect(mockManagedBlob.save).toHaveBeenCalledWith({
          ...existingSettings,
          reasoningModelOverride: "anthropic/claude-4-sonnet",
          reasoningModelRequestSettingsOverride: {
            reasoning: { effort: "medium" },
            temperature: 0.3,
          },
        });
      });

      it("should clear reasoning request settings when clearing reasoning model", async () => {
        const existingSettings = createMockSettings({
          reasoningModelOverride: "anthropic/claude-4-sonnet",
          reasoningModelRequestSettingsOverride: {
            reasoning: { effort: "high" },
            top_p: 0.9,
          },
        });
        mockManagedBlob.get.mockResolvedValue(existingSettings);

        const service = new ChatSettingsService(CHAT_ID);
        await service.setReasoningModelOverride(undefined);

        expect(mockManagedBlob.save).toHaveBeenCalledWith({
          ...existingSettings,
          reasoningModelOverride: undefined,
          reasoningModelRequestSettingsOverride: undefined,
        });
      });

      it("should save reasoning message history consolidation setting", async () => {
        const existingSettings = createMockSettings();
        mockManagedBlob.get.mockResolvedValue(existingSettings);

        const service = new ChatSettingsService(CHAT_ID);
        await service.setReasoningConsolidateMessageHistory(false);

        expect(mockManagedBlob.save).toHaveBeenCalledWith({
          ...existingSettings,
          reasoningConsolidateMessageHistory: false,
        });
      });
    });
  });
});
