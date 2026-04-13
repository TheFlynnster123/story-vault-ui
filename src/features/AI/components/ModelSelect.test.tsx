import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "../../../testing";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { ModelSelect } from "./ModelSelect";

// Do NOT mock useOpenRouterModels - let the real hook run
// Instead mock fetch to simulate OpenRouter API

// Mock notifications
vi.mock("@mantine/notifications", () => ({
  notifications: {
    show: vi.fn(),
  },
}));

const createMockModelsResponse = (models: Array<{ id: string; name: string }>) => ({
  data: models,
});

describe("ModelSelect with real useOpenRouterModels hook", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    vi.mocked(global.fetch).mockReset();
    queryClient.clear();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>,
    );
  };

  it("should render without crashing when API returns valid models", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(
          createMockModelsResponse([
            { id: "openai/gpt-4", name: "GPT-4" },
            { id: "anthropic/claude-3", name: "Claude 3" },
            { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2" },
          ]),
        ),
        { status: 200 },
      ),
    );

    renderWithProviders(
      <ModelSelect value="" onChange={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });
  });

  it("should render without crashing when API returns empty data", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(createMockModelsResponse([])),
        { status: 200 },
      ),
    );

    renderWithProviders(
      <ModelSelect value="" onChange={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });
  });

  it("should render without crashing when API fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(
      new Error("Network error"),
    );

    renderWithProviders(
      <ModelSelect value="" onChange={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });
  });

  it("should render without crashing when API returns 500", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("Server Error", { status: 500 }),
    );

    renderWithProviders(
      <ModelSelect value="" onChange={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });
  });

  it("should render without crashing when recent model overlaps with recommended", async () => {
    // Pre-populate localStorage with a recent model that's also in REDDIT_RECOMMENDED_IDS
    localStorage.setItem(
      "story-vault-recent-models",
      JSON.stringify(["deepseek/deepseek-v3.2", "moonshotai/kimi-k2.5"]),
    );

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(
          createMockModelsResponse([
            { id: "openai/gpt-4", name: "GPT-4" },
            { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2" },
            { id: "moonshotai/kimi-k2.5", name: "Kimi K2.5" },
            { id: "z-ai/glm-5-turbo", name: "GLM 5 Turbo" },
          ]),
        ),
        { status: 200 },
      ),
    );

    renderWithProviders(
      <ModelSelect value="" onChange={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });

    // Click to open dropdown
    const selectInput = screen.getByLabelText("Model");
    selectInput.click();

    // Verify no crash when dropdown opens
    await waitFor(() => {
      const dropdown = document.querySelector('[role="listbox"]');
      expect(dropdown).toBeInTheDocument();
    });
  });

  it("should filter out models with null or missing IDs from the dropdown", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: "openai/gpt-4", name: "GPT-4" },
            { id: "broken-model", name: null },
            { id: null, name: "Broken ID" },
          ],
        }),
        { status: 200 },
      ),
    );

    renderWithProviders(
      <ModelSelect value="" onChange={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });

    // Open the dropdown and verify malformed models are excluded
    const selectInput = screen.getByLabelText("Model");
    selectInput.click();

    await waitFor(() => {
      const dropdown = document.querySelector('[role="listbox"]');
      expect(dropdown).toBeInTheDocument();

      const options = Array.from(
        dropdown?.querySelectorAll('[role="option"]') || [],
      );
      const optionTexts = options.map((opt) => opt.textContent);

      // Valid model should appear
      expect(optionTexts).toContain("GPT-4");
      // Model with null id should be filtered out by deduplicateModels
      expect(optionTexts).not.toContain("Broken ID");
    });
  });

  it("should render without crashing when API returns duplicate model IDs", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(
          createMockModelsResponse([
            { id: "openai/gpt-4", name: "GPT-4" },
            { id: "openai/gpt-4", name: "GPT-4 (duplicate)" },
            { id: "anthropic/claude-3", name: "Claude 3" },
          ]),
        ),
        { status: 200 },
      ),
    );

    renderWithProviders(
      <ModelSelect value="" onChange={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });
  });
});
