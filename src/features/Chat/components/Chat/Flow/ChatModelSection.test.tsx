import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "../../../../../testing";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChatModelSection } from "./ChatModelSection";

// Mock notifications
vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

// Mock useChatModelOverride hook
const mockSetModelOverride = vi.fn();
const mockClearModelOverride = vi.fn();
const mockUseChatModelOverride = vi.fn();

vi.mock("../../../hooks/useChatModelOverride", () => ({
  useChatModelOverride: (...args: unknown[]) =>
    mockUseChatModelOverride(...args),
}));

// Mock useOpenRouterModels (used by ModelSelectorModal)
vi.mock("../../../../OpenRouter/hooks/useOpenRouterModels", () => ({
  useOpenRouterModels: () => ({
    models: [
      { id: "openai/gpt-4", name: "GPT-4", context_length: 128000 },
      { id: "anthropic/claude-3", name: "Claude 3", context_length: 200000 },
    ],
    isLoading: false,
  }),
}));

const CHAT_ID = "test-chat-123";

const defaultOverrideResult = {
  activeModelId: undefined,
  activeModel: undefined,
  isOverridden: false,
  setModelOverride: mockSetModelOverride,
  clearModelOverride: mockClearModelOverride,
  isLoading: false,
};

describe("ChatModelSection", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    mockUseChatModelOverride.mockReturnValue(defaultOverrideResult);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderSection = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ChatModelSection chatId={CHAT_ID} />
      </QueryClientProvider>,
    );

  // --- Default state ---

  it("should render the Chat Model button", () => {
    renderSection();

    expect(screen.getByText("Chat Model")).toBeInTheDocument();
  });

  it("should display 'Default' when no model is set", () => {
    renderSection();

    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("should show (using system default) label when using system default", () => {
    renderSection();

    expect(screen.getByText("(using system default)")).toBeInTheDocument();
  });

  it("should not show clear button when using system default", () => {
    renderSection();

    expect(
      screen.queryByTitle("Clear model override — revert to system default"),
    ).not.toBeInTheDocument();
  });

  // --- With system default model ---

  it("should display system default model name", () => {
    mockUseChatModelOverride.mockReturnValue({
      ...defaultOverrideResult,
      activeModelId: "openai/gpt-4",
      activeModel: { id: "openai/gpt-4", name: "GPT-4" },
      isOverridden: false,
    });

    renderSection();

    expect(screen.getByText("GPT-4")).toBeInTheDocument();
    expect(screen.getByText("(using system default)")).toBeInTheDocument();
  });

  // --- With chat-specific override ---

  it("should display overridden model name with (chat) label", () => {
    mockUseChatModelOverride.mockReturnValue({
      ...defaultOverrideResult,
      activeModelId: "anthropic/claude-3",
      activeModel: { id: "anthropic/claude-3", name: "Claude 3" },
      isOverridden: true,
    });

    renderSection();

    expect(screen.getByText("Claude 3")).toBeInTheDocument();
    expect(screen.getByText("(overridden for this chat)")).toBeInTheDocument();
  });

  it("should show clear button when model is overridden", () => {
    mockUseChatModelOverride.mockReturnValue({
      ...defaultOverrideResult,
      activeModelId: "anthropic/claude-3",
      activeModel: { id: "anthropic/claude-3", name: "Claude 3" },
      isOverridden: true,
    });

    renderSection();

    expect(
      screen.getByTitle("Clear model override — revert to system default"),
    ).toBeInTheDocument();
  });

  it("should call clearModelOverride when clear button is clicked", async () => {
    mockUseChatModelOverride.mockReturnValue({
      ...defaultOverrideResult,
      activeModelId: "anthropic/claude-3",
      activeModel: { id: "anthropic/claude-3", name: "Claude 3" },
      isOverridden: true,
    });

    renderSection();

    screen
      .getByTitle("Clear model override — revert to system default")
      .click();

    expect(mockClearModelOverride).toHaveBeenCalled();
  });

  // --- Loading state ---

  it("should display 'Loading...' when settings are loading", () => {
    mockUseChatModelOverride.mockReturnValue({
      ...defaultOverrideResult,
      isLoading: true,
    });

    renderSection();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  // --- Modal interaction ---

  it("should open the model selector modal when button is clicked", async () => {
    renderSection();

    screen.getByText("Chat Model").click();

    await waitFor(() => {
      expect(screen.getByText("Select Model")).toBeInTheDocument();
    });
  });

  it("should pass chatId to useChatModelOverride", () => {
    renderSection();

    expect(mockUseChatModelOverride).toHaveBeenCalledWith(CHAT_ID);
  });

  // --- Long model names ---

  it("should truncate long model names", () => {
    mockUseChatModelOverride.mockReturnValue({
      ...defaultOverrideResult,
      activeModelId: "org/very-long-model-name-that-exceeds-the-limit",
      activeModel: {
        id: "org/very-long-model-name-that-exceeds-the-limit",
        name: "A Very Long Model Name That Should Be Truncated",
      },
      isOverridden: false,
    });

    renderSection();

    // The truncated name should end with "…"
    const modelText = screen.getByText(/…$/);
    expect(modelText).toBeInTheDocument();
  });
});
