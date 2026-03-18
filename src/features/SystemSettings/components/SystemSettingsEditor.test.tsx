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

  it("should render model select with all model options including Grok 4.20 Beta", async () => {
    renderWithQueryClient(<SystemSettingsEditor />);

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });

    // Click the select to open the dropdown
    const selectInput = screen.getByLabelText("Model");
    selectInput.click();

    // Wait for dropdown to appear and verify the new model is present
    await waitFor(() => {
      const dropdown = document.querySelector('[role="listbox"]');
      expect(dropdown).toBeInTheDocument();

      // Check that the dropdown contains the new model option
      const options = Array.from(
        dropdown?.querySelectorAll('[role="option"]') || [],
      );
      const optionTexts = options.map((opt) => opt.textContent);

      expect(optionTexts).toContain("Grok 4.20 Beta");
    });
  });

  it("should include xAI models in the correct order in model options", async () => {
    renderWithQueryClient(<SystemSettingsEditor />);

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });

    // Click the select to open the dropdown
    const selectInput = screen.getByLabelText("Model");
    selectInput.click();

    // Wait for dropdown and verify order
    await waitFor(() => {
      const dropdown = document.querySelector('[role="listbox"]');
      expect(dropdown).toBeInTheDocument();

      const options = Array.from(
        dropdown?.querySelectorAll('[role="option"]') || [],
      );
      const optionTexts = options.map((opt) => opt.textContent);

      // Verify xAI models appear in correct order within their group
      const grok420BetaIndex = optionTexts.indexOf("Grok 4.20 Beta");
      const grok4Index = optionTexts.indexOf("Grok 4");
      const grok4FastIndex = optionTexts.indexOf("Grok 4 Fast");

      expect(grok4Index).toBeGreaterThan(grok420BetaIndex);
      expect(grok4FastIndex).toBeGreaterThan(grok4Index);

      // Verify premier models from other providers are present
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
