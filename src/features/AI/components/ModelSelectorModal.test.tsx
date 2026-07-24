import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent, waitFor } from "../../../testing";
import { d } from "../../../services/Dependencies";
import type {
  ModelPreset,
  SaveModelPreset,
} from "../services/ModelPresetsService";
import { ModelSelectorModal } from "./ModelSelectorModal";

const MOCK_MODELS = [
  {
    id: "openai/gpt-4",
    name: "GPT-4",
    description: "OpenAI flagship model",
    context_length: 128000,
    pricing: { prompt: "0.00003", completion: "0.00006" },
    supported_parameters: ["temperature", "top_p"],
  },
  {
    id: "anthropic/claude-3",
    name: "Claude 3",
    description: "Anthropic reasoning model",
    context_length: 200000,
    pricing: { prompt: "0.000003", completion: "0.000015" },
    supported_parameters: ["reasoning", "temperature"],
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

type MockModel = (typeof MOCK_MODELS)[number];

const createModelsResponse = (models: MockModel[]) => ({ data: models });

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
      savePreset: vi.fn(
        async ({ name, modelId, requestSettings }: SaveModelPreset) => {
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
        },
      ),
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

  const mockModels = (models: MockModel[] = MOCK_MODELS) => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createModelsResponse(models)), {
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
          isOpen
          onClose={vi.fn()}
          selectedModelId={undefined}
          onSelect={vi.fn()}
          {...props}
        />
      </QueryClientProvider>,
    );

  const openBrowseModels = async () => {
    await screen.findByText("No model setups yet");
    await userEvent
      .setup()
      .click(screen.getByRole("radio", { name: "Browse models" }));
  };

  const openModel = async (modelName: string) => {
    await openBrowseModels();
    await userEvent.setup().click(await screen.findByText(modelName));
  };

  it("does not render while closed", () => {
    mockModels();
    renderModal({ isOpen: false });

    expect(
      screen.queryByText("Select model setup"),
    ).not.toBeInTheDocument();
  });

  it("opens on the remembered setups screen", async () => {
    mockModels();
    renderModal();

    expect(
      await screen.findByText("Select model setup"),
    ).toBeInTheDocument();
    expect(screen.getByText("My setups")).toBeInTheDocument();
    expect(screen.getByText("No model setups yet")).toBeInTheDocument();
  });

  it("browses all available models", async () => {
    mockModels();
    renderModal();

    await openBrowseModels();

    expect(await screen.findByText("GPT-4")).toBeInTheDocument();
    expect(screen.getByText("Claude 3")).toBeInTheDocument();
    expect(screen.getByText("3 models available")).toBeInTheDocument();
  });

  it("filters the catalog by name, ID, and description", async () => {
    mockModels();
    renderModal();
    const user = userEvent.setup();
    await openBrowseModels();
    const search = screen.getByLabelText("Search models");

    await user.type(search, "openai");
    expect(screen.getByText("GPT-4")).toBeInTheDocument();
    expect(screen.queryByText("Claude 3")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "reasoning");
    expect(screen.getByText("Claude 3")).toBeInTheDocument();
    expect(screen.queryByText("GPT-4")).not.toBeInTheDocument();
  });

  it("shows an empty search result", async () => {
    mockModels();
    renderModal();
    const user = userEvent.setup();
    await openBrowseModels();

    await user.type(screen.getByLabelText("Search models"), "missing-model");

    expect(
      screen.getByText(/No models found matching/),
    ).toBeInTheDocument();
  });

  it("previews a model without committing it", async () => {
    mockModels();
    const onSelect = vi.fn();
    renderModal({ onSelect });

    await openModel("GPT-4");

    expect(screen.getByText("Configure setup")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use this setup" })).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("returns to the list without committing the draft", async () => {
    mockModels();
    const onSelect = vi.fn();
    renderModal({ onSelect });
    const user = userEvent.setup();
    await openModel("GPT-4");

    await user.click(screen.getByLabelText("Back to model setups"));

    expect(screen.getByText("Select model setup")).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("applies the previewed model explicitly and tracks it", async () => {
    mockModels();
    const onSelect = vi.fn();
    const onClose = vi.fn();
    renderModal({ onSelect, onClose });
    const user = userEvent.setup();
    await openModel("GPT-4");

    await user.click(screen.getByRole("button", { name: "Use this setup" }));

    expect(onSelect).toHaveBeenCalledWith("openai/gpt-4", undefined);
    expect(onClose).toHaveBeenCalled();
    expect(
      JSON.parse(
        localStorage.getItem("story-vault-recent-models") ?? "[]",
      ),
    ).toContain("openai/gpt-4");
  });

  it("opens the active setup with its current configuration", async () => {
    mockModels();
    renderModal({
      selectedModelId: "openai/gpt-4",
      selectedRequestSettings: { temperature: 0.6 },
    });

    expect(await screen.findByText("Configure setup")).toBeInTheDocument();
    expect(await screen.findByLabelText("Temperature")).toHaveValue("0.6");
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("edits supported settings and applies them together", async () => {
    mockModels();
    const onSelect = vi.fn();
    renderModal({ onSelect });
    const user = userEvent.setup();
    await openModel("Claude 3");

    await user.click(screen.getByLabelText("Reasoning level for Claude 3"));
    await user.click(await screen.findByText("High"));
    await user.clear(screen.getByLabelText("Temperature"));
    await user.type(screen.getByLabelText("Temperature"), "0.4");
    await user.click(screen.getByRole("button", { name: "Use this setup" }));

    expect(onSelect).toHaveBeenCalledWith("anthropic/claude-3", {
      reasoning: { effort: "high" },
      temperature: 0.4,
    });
  });

  it("explains advanced fields and initializes retry defaults", async () => {
    mockModels();
    renderModal({
      selectedModelId: "openai/gpt-4",
    });
    const user = userEvent.setup();

    await user.click(
      await screen.findByLabelText("Advanced settings for GPT-4"),
    );

    expect(
      screen.getByText(/0.8–1 is typical; tune this or Temperature/),
    ).toBeInTheDocument();
    await user.click(screen.getByLabelText("Enable retries"));
    expect(screen.getByLabelText("Retry delay in seconds")).toHaveValue("0");
    expect(screen.getByLabelText("Number of Retries")).toHaveValue("1");
  });

  it("shows saved setups and applies one explicitly", async () => {
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
    mockModels();
    const onSelect = vi.fn();
    renderModal({ onSelect });
    const user = userEvent.setup();

    await user.click(await screen.findByText("Focused"));
    expect(onSelect).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Use this setup" }));

    expect(onSelect).toHaveBeenCalledWith("openai/gpt-4", {
      temperature: 0.2,
    });
  });

  it("saves the current draft as a reusable setup", async () => {
    mockModels();
    renderModal({ selectedModelId: "openai/gpt-4" });
    const user = userEvent.setup();

    await user.type(
      await screen.findByLabelText("Preset name for GPT-4"),
      "Creative draft",
    );
    await user.click(screen.getByRole("button", { name: "Save as new" }));
    await user.click(screen.getByLabelText("Back to model setups"));

    expect(await screen.findByText("Creative draft")).toBeInTheDocument();
  });

  it("deletes a saved setup from the list", async () => {
    storedPresets = [
      {
        id: "preset-1",
        name: "Temporary",
        modelId: "openai/gpt-4",
        createdAtUtcMs: 1,
        updatedAtUtcMs: 1,
      },
    ];
    mockModels();
    renderModal();
    const user = userEvent.setup();

    await user.click(
      await screen.findByLabelText("Delete preset Temporary"),
    );

    await waitFor(() =>
      expect(screen.queryByText("Temporary")).not.toBeInTheDocument(),
    );
  });

  it("shows recently used models as remembered choices", async () => {
    localStorage.setItem(
      "story-vault-recent-models",
      JSON.stringify(["openai/gpt-4"]),
    );
    mockModels();
    renderModal();

    expect(await screen.findByText("Recently used")).toBeInTheDocument();
    expect(screen.getByText("GPT-4")).toBeInTheDocument();
  });

  it("closes from the modal close button", async () => {
    mockModels();
    const onClose = vi.fn();
    renderModal({ onClose });
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Close"));

    expect(onClose).toHaveBeenCalled();
  });

  it("renders a usable empty state when model loading fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));
    renderModal();

    expect(
      await screen.findByText("Select model setup"),
    ).toBeInTheDocument();
    expect(screen.getByText("No model setups yet")).toBeInTheDocument();
  });
});
