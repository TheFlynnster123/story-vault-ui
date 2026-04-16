import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, userEvent } from "../../../testing";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { ModelSelectorModal } from "./ModelSelectorModal";

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

const createMockModelsResponse = (
  models: Array<{
    id: string;
    name: string;
    description?: string;
    context_length?: number;
    pricing?: { prompt?: string; completion?: string };
  }>,
) => ({ data: models });

const MOCK_MODELS = [
  {
    id: "openai/gpt-4",
    name: "GPT-4",
    description: "OpenAI flagship model",
    context_length: 128000,
    pricing: { prompt: "0.00003", completion: "0.00006" },
  },
  {
    id: "anthropic/claude-3",
    name: "Claude 3",
    description: "Anthropic reasoning model",
    context_length: 200000,
    pricing: { prompt: "0.000003", completion: "0.000015" },
  },
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    description: "DeepSeek open model",
    context_length: 64000,
    pricing: { prompt: "0.0000005", completion: "0.000001" },
  },
  {
    id: "small/tiny-model",
    name: "Tiny Model",
    context_length: 4096,
    pricing: { prompt: "0.00001", completion: "0.00001" },
  },
];

describe("ModelSelectorModal", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    vi.mocked(global.fetch).mockReset();
    queryClient.clear();
  });

  const mockFetchModels = (models = MOCK_MODELS) => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createMockModelsResponse(models)), {
        status: 200,
      }),
    );
  };

  const renderModal = (
    props: Partial<React.ComponentProps<typeof ModelSelectorModal>> = {},
  ) =>
    render(
      <QueryClientProvider client={queryClient}>
        <ModelSelectorModal
          isOpen={true}
          onClose={vi.fn()}
          selectedModelId={undefined}
          onSelect={vi.fn()}
          {...props}
        />
      </QueryClientProvider>,
    );

  // --- Rendering ---

  it("should not render anything when isOpen is false", () => {
    mockFetchModels();
    renderModal({ isOpen: false });

    expect(screen.queryByText("Select Model")).not.toBeInTheDocument();
  });

  it("should render modal header when open", async () => {
    mockFetchModels();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("Select Model")).toBeInTheDocument();
    });
  });

  it("should render search input", async () => {
    mockFetchModels();
    renderModal();

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          "Search models by name, ID, or description...",
        ),
      ).toBeInTheDocument();
    });
  });

  it("should display model names once loaded", async () => {
    mockFetchModels();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("GPT-4")).toBeInTheDocument();
      expect(screen.getByText("Claude 3")).toBeInTheDocument();
      expect(screen.getByText("Tiny Model")).toBeInTheDocument();
    });
  });

  it("should display model count", async () => {
    mockFetchModels();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("4 models available")).toBeInTheDocument();
    });
  });

  // --- Model stats ---

  it("should display context length for models", async () => {
    mockFetchModels();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText(/Context: 128K/)).toBeInTheDocument();
      expect(screen.getByText(/Context: 4K/)).toBeInTheDocument();
    });
  });

  it("should display pricing for models", async () => {
    mockFetchModels();
    renderModal();

    await waitFor(() => {
      // GPT-4 prompt: 0.00003 * 1M = $30.00
      expect(screen.getByText(/Prompt: \$30\.00/)).toBeInTheDocument();
    });
  });

  // --- Search ---

  it("should filter models by name when searching", async () => {
    mockFetchModels();
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("GPT-4")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search models by name, ID, or description...",
    );
    await user.type(searchInput, "Claude");

    await waitFor(() => {
      expect(screen.getByText("Claude 3")).toBeInTheDocument();
      expect(screen.queryByText("GPT-4")).not.toBeInTheDocument();
      expect(screen.queryByText("Tiny Model")).not.toBeInTheDocument();
    });
  });

  it("should filter models by ID when searching", async () => {
    mockFetchModels();
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("GPT-4")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search models by name, ID, or description...",
    );
    await user.type(searchInput, "openai");

    await waitFor(() => {
      expect(screen.getByText("GPT-4")).toBeInTheDocument();
      expect(screen.queryByText("Claude 3")).not.toBeInTheDocument();
    });
  });

  it("should filter models by description when searching", async () => {
    mockFetchModels();
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("GPT-4")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search models by name, ID, or description...",
    );
    await user.type(searchInput, "reasoning");

    await waitFor(() => {
      expect(screen.getByText("Claude 3")).toBeInTheDocument();
      expect(screen.queryByText("GPT-4")).not.toBeInTheDocument();
    });
  });

  it("should show no results message when search has no matches", async () => {
    mockFetchModels();
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("GPT-4")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search models by name, ID, or description...",
    );
    await user.type(searchInput, "nonexistent-xyz");

    await waitFor(() => {
      expect(screen.getByText(/No models found matching/)).toBeInTheDocument();
    });
  });

  // --- Selection ---

  it("should call onSelect and onClose when a model is clicked", async () => {
    mockFetchModels();
    const onSelect = vi.fn();
    const onClose = vi.fn();
    renderModal({ onSelect, onClose });

    await waitFor(() => {
      expect(screen.getByText("GPT-4")).toBeInTheDocument();
    });

    screen.getByText("GPT-4").click();

    expect(onSelect).toHaveBeenCalledWith("openai/gpt-4");
    expect(onClose).toHaveBeenCalled();
  });

  it("should track the selected model in recent models", async () => {
    mockFetchModels();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("GPT-4")).toBeInTheDocument();
    });

    screen.getByText("GPT-4").click();

    const stored = JSON.parse(
      localStorage.getItem("story-vault-recent-models") || "[]",
    );
    expect(stored).toContain("openai/gpt-4");
  });

  // --- Close behavior ---

  it("should call onClose when close button is clicked", async () => {
    mockFetchModels();
    const onClose = vi.fn();
    renderModal({ onClose });

    await waitFor(() => {
      expect(screen.getByText("Select Model")).toBeInTheDocument();
    });

    screen.getByLabelText("Close").click();

    expect(onClose).toHaveBeenCalled();
  });

  it("should call onClose when Escape is pressed", async () => {
    mockFetchModels();
    const onClose = vi.fn();
    renderModal({ onClose });

    await waitFor(() => {
      expect(screen.getByText("Select Model")).toBeInTheDocument();
    });

    const escEvent = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(escEvent);

    expect(onClose).toHaveBeenCalled();
  });

  // --- Grouping ---

  it("should show Reddit Recommended group for recommended models", async () => {
    mockFetchModels();
    renderModal();

    await waitFor(() => {
      // deepseek/deepseek-v3.2 is in REDDIT_RECOMMENDED_IDS
      expect(screen.getByText("⭐ Reddit Recommended")).toBeInTheDocument();
    });
  });

  it("should show Recent group when recent models exist", async () => {
    localStorage.setItem(
      "story-vault-recent-models",
      JSON.stringify(["openai/gpt-4"]),
    );

    mockFetchModels();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("🕐 Recent")).toBeInTheDocument();
    });
  });

  it("should show All Models group", async () => {
    mockFetchModels();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("All Models")).toBeInTheDocument();
    });
  });

  // --- Error resilience ---

  it("should render without crashing when API fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("Select Model")).toBeInTheDocument();
    });
  });
});
