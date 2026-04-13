import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "../../../testing";
import { screen, waitFor } from "@testing-library/react";
import { SystemSettingsEditor } from "./SystemSettingsEditor";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the useSystemSettings hook
const mockSaveSystemSettings = vi.fn();
const mockUseSystemSettings = vi.fn();

vi.mock("../hooks/useSystemSettings", () => ({
  useSystemSettings: () => mockUseSystemSettings(),
}));

// Mock the useOpenRouterModels hook
vi.mock("../../OpenRouter/hooks/useOpenRouterModels", () => ({
  useOpenRouterModels: () => ({
    models: [
      { id: "x-ai/grok-4.20-beta", name: "Grok 4.20 Beta" },
      { id: "x-ai/grok-4", name: "Grok 4" },
      { id: "x-ai/grok-4-fast", name: "Grok 4 Fast" },
      { id: "anthropic/claude-opus-4", name: "Claude Opus 4" },
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
      { id: "openai/gpt-5", name: "GPT-5" },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2" },
      { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick" },
      { id: "moonshotai/kimi-k2.5", name: "Kimi K2.5" },
      { id: "meituan/longcat-flash-chat", name: "LongCat Flash Chat" },
      { id: "qwen/qwen3-235b-a22b", name: "Qwen3 235B" },
      { id: "z-ai/glm-5-turbo", name: "GLM 5 Turbo" },
    ],
    isLoading: false,
  }),
}));

// Mock notifications
vi.mock("@mantine/notifications", () => ({
  notifications: {
    show: vi.fn(),
  },
}));

describe("SystemSettingsEditor", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    mockUseSystemSettings.mockReturnValue({
      systemSettings: {
        chatGenerationSettings: {
          model: "",
        },
      },
      saveSystemSettings: mockSaveSystemSettings,
      isLoading: false,
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>,
    );
  };

  it("should render model select with model options including Grok 4.20 Beta", async () => {
    renderWithQueryClient(<SystemSettingsEditor />);

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });

    // Click the select to open the dropdown
    const selectInput = screen.getByLabelText("Model");
    selectInput.click();

    // Wait for dropdown to appear and verify the model is present
    await waitFor(() => {
      const dropdown = document.querySelector('[role="listbox"]');
      expect(dropdown).toBeInTheDocument();

      const options = Array.from(
        dropdown?.querySelectorAll('[role="option"]') || [],
      );
      const optionTexts = options.map((opt) => opt.textContent);

      expect(optionTexts).toContain("Grok 4.20 Beta");
    });
  });

  it("should include models from multiple providers", async () => {
    renderWithQueryClient(<SystemSettingsEditor />);

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });

    const selectInput = screen.getByLabelText("Model");
    selectInput.click();

    await waitFor(() => {
      const dropdown = document.querySelector('[role="listbox"]');
      expect(dropdown).toBeInTheDocument();

      const options = Array.from(
        dropdown?.querySelectorAll('[role="option"]') || [],
      );
      const optionTexts = options.map((opt) => opt.textContent);

      expect(optionTexts).toContain("Claude Opus 4");
      expect(optionTexts).toContain("Claude Sonnet 4");
      expect(optionTexts).toContain("GPT-5");
      expect(optionTexts).toContain("Gemini 2.5 Pro");
      expect(optionTexts).toContain("DeepSeek V3.2");
      expect(optionTexts).toContain("Llama 4 Maverick");
      expect(optionTexts).toContain("Kimi K2.5");
      expect(optionTexts).toContain("LongCat Flash Chat");
      expect(optionTexts).toContain("Qwen3 235B");
      expect(optionTexts).toContain("GLM 5 Turbo");
    });
  });
});
