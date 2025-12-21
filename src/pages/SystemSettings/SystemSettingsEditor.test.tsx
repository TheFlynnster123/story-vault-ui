import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "../../test-utils";
import { screen, waitFor } from "@testing-library/react";
import { SystemSettingsEditor } from "./SystemSettingsEditor";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the useSystemSettings hook
const mockSaveSystemSettings = vi.fn();
const mockUseSystemSettings = vi.fn();

vi.mock("../../queries/system-settings/useSystemSettings", () => ({
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
      </QueryClientProvider>
    );
  };

  it("should render model select with all model options including grok-4-1-fast-reasoning", async () => {
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
        dropdown?.querySelectorAll('[role="option"]') || []
      );
      const optionTexts = options.map((opt) => opt.textContent);

      expect(optionTexts).toContain("grok-4-1-fast-reasoning");
    });
  });

  it("should include grok-4-1-fast-reasoning in the correct position in model options", async () => {
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
        dropdown?.querySelectorAll('[role="option"]') || []
      );
      const optionTexts = options.map((opt) => opt.textContent);

      // Verify the new model appears after grok-4-0709 and before grok-4-fast-non-reasoning
      const grok4_0709Index = optionTexts.indexOf("grok-4-0709");
      const grok4_1_fastReasoningIndex = optionTexts.indexOf(
        "grok-4-1-fast-reasoning"
      );
      const grok4_fastNonReasoningIndex = optionTexts.indexOf(
        "grok-4-fast-non-reasoning"
      );

      expect(grok4_1_fastReasoningIndex).toBeGreaterThan(grok4_0709Index);
      expect(grok4_1_fastReasoningIndex).toBeLessThan(
        grok4_fastNonReasoningIndex
      );
    });
  });
});
