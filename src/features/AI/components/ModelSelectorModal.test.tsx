import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, userEvent } from "../../../testing";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { ModelSelectorModal } from "./ModelSelectorModal";
import { d } from "../../../services/Dependencies";
import type {
  ModelPreset,
  SaveModelPreset,
} from "../services/ModelPresetsService";

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

vi.mock("react-virtuoso", () => ({
  GroupedVirtuoso: ({
    groupCounts,
    groupContent,
    itemContent,
  }: {
    groupCounts: number[];
    groupContent: (groupIndex: number) => React.ReactNode;
    itemContent: (itemIndex: number) => React.ReactNode;
  }) => {
    const nodes: React.ReactNode[] = [];
    let itemIndex = 0;
    groupCounts.forEach((count: number, groupIndex: number) => {
      nodes.push(<div key={`g-${groupIndex}`}>{groupContent(groupIndex)}</div>);
      for (let i = 0; i < count; i++) {
        nodes.push(<div key={`i-${itemIndex}`}>{itemContent(itemIndex)}</div>);
        itemIndex++;
      }
    });
    return <div>{nodes}</div>;
  },
}));

const createMockModelsResponse = (
  models: Array<{
    id: string;
    name: string;
    description?: string;
    context_length?: number;
    pricing?: { prompt?: string; completion?: string };
    supported_parameters?: string[];
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

type MockModel = Parameters<typeof createMockModelsResponse>[0][number];

describe("ModelSelectorModal", () => {
  let queryClient: QueryClient;
  let storedPresets: ModelPreset[];
  let presetSubscribers: Array<() => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    storedPresets = [];
    presetSubscribers = [];
    vi.spyOn(d, "ModelPresetsService").mockReturnValue({
      getPresets: vi.fn(async () => [...storedPresets]),
      subscribe: vi.fn((callback: () => void) => {
        presetSubscribers.push(callback);
        return () => {
          presetSubscribers = presetSubscribers.filter(
            (subscriber) => subscriber !== callback,
          );
        };
      }),
      savePreset: vi.fn(async ({
        name,
        modelId,
        requestSettings,
      }: SaveModelPreset) => {
        const preset: ModelPreset = {
          id: `preset-${storedPresets.length + 1}`,
          name: name.trim(),
          modelId,
          requestSettings,
          createdAtUtcMs: Date.now(),
          updatedAtUtcMs: Date.now(),
        };
        storedPresets = [preset, ...storedPresets];
        presetSubscribers.forEach((subscriber) => subscriber());
        return preset;
      }),
      deletePreset: vi.fn(async (presetId: string) => {
        storedPresets = storedPresets.filter(
          (preset) => preset.id !== presetId,
        );
        presetSubscribers.forEach((subscriber) => subscriber());
      }),
    } as unknown as ReturnType<typeof d.ModelPresetsService>);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  const mockFetchModels = (models: MockModel[] = MOCK_MODELS) => {
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

  it("should show reasoning level selector for models that support reasoning", async () => {
    mockFetchModels([
      {
        id: "openai/o4-mini",
        name: "o4-mini",
        supported_parameters: ["reasoning"],
      },
    ]);
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("o4-mini")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Advanced settings for o4-mini"));

    expect(
      screen.getByLabelText("Reasoning level for o4-mini"),
    ).toBeInTheDocument();
  });

  it("should explain advanced fields and their typical ranges", async () => {
    mockFetchModels([
      {
        id: "openai/gpt-4",
        name: "GPT-4",
        supported_parameters: ["temperature", "top_p", "top_k"],
      },
    ]);
    const user = userEvent.setup();
    renderModal();

    await user.click(
      await screen.findByLabelText("Advanced settings for GPT-4"),
    );

    expect(
      screen.getByText(/0 is consistent, 0.7–1 is balanced/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/0.8–1 is typical; tune this or Temperature/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/20–100 is a common focused range/),
    ).toBeInTheDocument();
  });

  it("should expand the selected model configuration inline", async () => {
    mockFetchModels([
      {
        id: "openai/gpt-4",
        name: "GPT-4",
        supported_parameters: ["temperature"],
      },
    ]);
    renderModal({
      selectedModelId: "openai/gpt-4",
      selectedRequestSettings: { temperature: 0.6 },
    });

    expect(await screen.findByLabelText("Temperature")).toHaveValue(0.6);
    expect(
      screen.getByLabelText("Advanced settings for GPT-4"),
    ).toHaveAttribute("aria-expanded", "true");
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

  it("should pass selected advanced settings when a supported model is clicked", async () => {
    mockFetchModels([
      {
        id: "openai/o4-mini",
        name: "o4-mini",
        supported_parameters: ["reasoning", "temperature"],
      },
    ]);
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderModal({ onSelect });

    await waitFor(() => {
      expect(screen.getByText("o4-mini")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Advanced settings for o4-mini"));
    await user.selectOptions(
      screen.getByLabelText("Reasoning level for o4-mini"),
      "high",
    );
    await user.clear(screen.getByLabelText("Temperature"));
    await user.type(screen.getByLabelText("Temperature"), "0.4");
    screen.getByText("o4-mini").click();

    expect(onSelect).toHaveBeenCalledWith("openai/o4-mini", {
      reasoning: { effort: "high" },
      temperature: 0.4,
    });
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

  it("should save and display a configured model preset", async () => {
    mockFetchModels([
      {
        id: "openai/gpt-4",
        name: "GPT-4",
        supported_parameters: ["temperature"],
      },
    ]);
    const user = userEvent.setup();
    renderModal({
      selectedModelId: "openai/gpt-4",
      selectedRequestSettings: { temperature: 0.7 },
    });

    await user.type(
      await screen.findByLabelText("Preset name for GPT-4"),
      "Creative draft",
    );
    await user.click(screen.getByRole("button", { name: "Save preset" }));

    expect(screen.getByText("Saved presets")).toBeInTheDocument();
    expect(await screen.findByText("Creative draft")).toBeInTheDocument();
  });

  it("should reselect a saved model configuration", async () => {
    storedPresets = [
      {
        id: "preset-1",
        name: "Focused",
        modelId: "openai/gpt-4",
        requestSettings: { temperature: 0.2 },
        createdAtUtcMs: 1,
        updatedAtUtcMs: 1,
      },
    ];
    mockFetchModels();
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderModal({ onSelect });

    await user.click(await screen.findByLabelText("Use preset Focused"));

    expect(onSelect).toHaveBeenCalledWith("openai/gpt-4", {
      temperature: 0.2,
    });
  });

  it("should delete a saved model preset", async () => {
    storedPresets = [
      {
        id: "preset-1",
        name: "Temporary",
        modelId: "openai/gpt-4",
        createdAtUtcMs: 1,
        updatedAtUtcMs: 1,
      },
    ];
    mockFetchModels();
    const user = userEvent.setup();
    renderModal();

    await user.click(
      await screen.findByLabelText("Delete preset Temporary"),
    );

    expect(screen.queryByText("Temporary")).not.toBeInTheDocument();
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
