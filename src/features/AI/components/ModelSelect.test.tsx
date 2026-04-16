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

const createMockModelsResponse = (
  models: Array<{ id: string; name: string }>,
) => ({
  data: models,
});

describe("ModelSelect with ModelSelectorModal", () => {
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

    renderWithProviders(<ModelSelect value="" onChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });
  });

  it("should display selected model name when value is set", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(
          createMockModelsResponse([
            { id: "openai/gpt-4", name: "GPT-4" },
            { id: "anthropic/claude-3", name: "Claude 3" },
          ]),
        ),
        { status: 200 },
      ),
    );

    renderWithProviders(
      <ModelSelect value="openai/gpt-4" onChange={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByText("GPT-4")).toBeInTheDocument();
    });
  });

  it("should display 'Default' when value is empty", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createMockModelsResponse([])), {
        status: 200,
      }),
    );

    renderWithProviders(<ModelSelect value="" onChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Default")).toBeInTheDocument();
    });
  });

  it("should render without crashing when API fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

    renderWithProviders(<ModelSelect value="" onChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });
  });

  it("should render without crashing when API returns 500", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("Server Error", { status: 500 }),
    );

    renderWithProviders(<ModelSelect value="" onChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });
  });

  it("should open modal when button is clicked", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(
          createMockModelsResponse([{ id: "openai/gpt-4", name: "GPT-4" }]),
        ),
        { status: 200 },
      ),
    );

    renderWithProviders(<ModelSelect value="" onChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });

    screen.getByLabelText("Model").click();

    await waitFor(() => {
      expect(screen.getByText("Select Model")).toBeInTheDocument();
    });
  });

  it("should show clear button when a model is selected", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(
          createMockModelsResponse([{ id: "openai/gpt-4", name: "GPT-4" }]),
        ),
        { status: 200 },
      ),
    );

    renderWithProviders(
      <ModelSelect value="openai/gpt-4" onChange={() => {}} />,
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText("Clear model selection"),
      ).toBeInTheDocument();
    });
  });

  it("should call onChange with null when clear is clicked", async () => {
    const handleChange = vi.fn();

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(
          createMockModelsResponse([{ id: "openai/gpt-4", name: "GPT-4" }]),
        ),
        { status: 200 },
      ),
    );

    renderWithProviders(
      <ModelSelect value="openai/gpt-4" onChange={handleChange} />,
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText("Clear model selection"),
      ).toBeInTheDocument();
    });

    screen.getByLabelText("Clear model selection").click();

    expect(handleChange).toHaveBeenCalledWith(null);
  });

  it("should use custom label when provided", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createMockModelsResponse([])), {
        status: 200,
      }),
    );

    renderWithProviders(
      <ModelSelect value="" onChange={() => {}} label="Plan Model" />,
    );

    await waitFor(() => {
      expect(screen.getByText("Plan Model")).toBeInTheDocument();
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

    renderWithProviders(<ModelSelect value="" onChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Model")).toBeInTheDocument();
    });
  });
});
