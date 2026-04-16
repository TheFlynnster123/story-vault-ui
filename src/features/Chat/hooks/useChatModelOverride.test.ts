import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { d } from "../../../services/Dependencies";

vi.mock("../../../services/Dependencies");

const mockUseChatSettings = vi.fn();
vi.mock("./useChatSettings", () => ({
  useChatSettings: (...args: unknown[]) => mockUseChatSettings(...args),
}));

const mockUseSystemSettings = vi.fn();
vi.mock("../../SystemSettings/hooks/useSystemSettings", () => ({
  useSystemSettings: () => mockUseSystemSettings(),
}));

const mockUseOpenRouterModels = vi.fn();
vi.mock("../../OpenRouter/hooks/useOpenRouterModels", () => ({
  useOpenRouterModels: () => mockUseOpenRouterModels(),
}));

const CHAT_ID = "test-chat-123";

const MODELS = [
  { id: "openai/gpt-4", name: "GPT-4", context_length: 128000 },
  { id: "anthropic/claude-3", name: "Claude 3", context_length: 200000 },
];

const mockSetModelOverride = vi.fn().mockResolvedValue(undefined);

const createMockChatSettingsService = () => ({
  setModelOverride: mockSetModelOverride,
});

describe("useChatModelOverride", () => {
  let mockChatSettingsService: ReturnType<typeof createMockChatSettingsService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChatSettingsService = createMockChatSettingsService();
    vi.mocked(d.ChatSettingsService).mockReturnValue(
      mockChatSettingsService as any,
    );

    mockUseChatSettings.mockReturnValue({
      chatSettings: undefined,
      isLoading: false,
    });
    mockUseSystemSettings.mockReturnValue({
      systemSettings: undefined,
      isLoading: false,
    });
    mockUseOpenRouterModels.mockReturnValue({
      models: MODELS,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const importHook = async () => {
    const mod = await import("./useChatModelOverride");
    return mod.useChatModelOverride;
  };

  // --- Default behavior (no override, no system default) ---

  it("should return undefined activeModelId when no settings exist", async () => {
    const useChatModelOverride = await importHook();
    const { result } = renderHook(() => useChatModelOverride(CHAT_ID));

    expect(result.current.activeModelId).toBeUndefined();
    expect(result.current.activeModel).toBeUndefined();
    expect(result.current.isOverridden).toBe(false);
  });

  // --- System default only ---

  it("should use system default when no chat override exists", async () => {
    mockUseSystemSettings.mockReturnValue({
      systemSettings: {
        chatGenerationSettings: { model: "openai/gpt-4" },
      },
      isLoading: false,
    });

    const useChatModelOverride = await importHook();
    const { result } = renderHook(() => useChatModelOverride(CHAT_ID));

    expect(result.current.activeModelId).toBe("openai/gpt-4");
    expect(result.current.activeModel?.name).toBe("GPT-4");
    expect(result.current.isOverridden).toBe(false);
  });

  // --- Chat override takes precedence ---

  it("should use chat override when present", async () => {
    mockUseChatSettings.mockReturnValue({
      chatSettings: { modelOverride: "anthropic/claude-3" },
      isLoading: false,
    });
    mockUseSystemSettings.mockReturnValue({
      systemSettings: {
        chatGenerationSettings: { model: "openai/gpt-4" },
      },
      isLoading: false,
    });

    const useChatModelOverride = await importHook();
    const { result } = renderHook(() => useChatModelOverride(CHAT_ID));

    expect(result.current.activeModelId).toBe("anthropic/claude-3");
    expect(result.current.activeModel?.name).toBe("Claude 3");
    expect(result.current.isOverridden).toBe(true);
  });

  // --- setModelOverride ---

  it("should call ChatSettingsService.setModelOverride with model ID", async () => {
    const useChatModelOverride = await importHook();
    const { result } = renderHook(() => useChatModelOverride(CHAT_ID));

    await result.current.setModelOverride("anthropic/claude-3");

    expect(mockSetModelOverride).toHaveBeenCalledWith("anthropic/claude-3");
  });

  // --- clearModelOverride ---

  it("should call ChatSettingsService.setModelOverride with undefined", async () => {
    const useChatModelOverride = await importHook();
    const { result } = renderHook(() => useChatModelOverride(CHAT_ID));

    await result.current.clearModelOverride();

    expect(mockSetModelOverride).toHaveBeenCalledWith(undefined);
  });

  // --- Loading state ---

  it("should report loading when chat settings are loading", async () => {
    mockUseChatSettings.mockReturnValue({
      chatSettings: undefined,
      isLoading: true,
    });

    const useChatModelOverride = await importHook();
    const { result } = renderHook(() => useChatModelOverride(CHAT_ID));

    expect(result.current.isLoading).toBe(true);
  });

  it("should report loading when system settings are loading", async () => {
    mockUseSystemSettings.mockReturnValue({
      systemSettings: undefined,
      isLoading: true,
    });

    const useChatModelOverride = await importHook();
    const { result } = renderHook(() => useChatModelOverride(CHAT_ID));

    expect(result.current.isLoading).toBe(true);
  });

  it("should not be loading when both settings are loaded", async () => {
    const useChatModelOverride = await importHook();
    const { result } = renderHook(() => useChatModelOverride(CHAT_ID));

    expect(result.current.isLoading).toBe(false);
  });

  // --- Model not found in list ---

  it("should return undefined activeModel when model ID is not in the list", async () => {
    mockUseSystemSettings.mockReturnValue({
      systemSettings: {
        chatGenerationSettings: { model: "unknown/model" },
      },
      isLoading: false,
    });

    const useChatModelOverride = await importHook();
    const { result } = renderHook(() => useChatModelOverride(CHAT_ID));

    expect(result.current.activeModelId).toBe("unknown/model");
    expect(result.current.activeModel).toBeUndefined();
  });
});
