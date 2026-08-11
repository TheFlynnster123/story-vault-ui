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

const MOCK_ENDPOINTS = [
  {
    name: "Azure | GPT-4",
    provider_name: "Azure",
    tag: "azure",
    pricing: { prompt: "0.00000015", completion: "0.0000006" },
    uptime_last_1d: 99.92,
  },
  {
    name: "OpenAI | GPT-4",
    provider_name: "OpenAI",
    tag: "openai",
    pricing: { prompt: "0.0000002", completion: "0.0000008" },
    uptime_last_1d: 99.99,
  },
];

type MockModel = (typeof MOCK_MODELS)[number];

const createModelsResponse = (models: MockModel[]) => ({ data: models });

describe("ModelSelectorModal", () => {
  let queryClient: QueryClient;
  let storedPresets: ModelPreset[];
  let presetSubscribers: Array<() => void>;
  let savePreset: ReturnType<
    typeof vi.fn<[SaveModelPreset], Promise<ModelPreset>>
  >;
  let savePresetDebounced: ReturnType<
    typeof vi.fn<[SaveModelPreset], Promise<ModelPreset>>
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    storedPresets = [];
    presetSubscribers = [];
    const upsertPreset = async ({
      id,
      name,
      modelId,
      requestSettings,
    }: SaveModelPreset): Promise<ModelPreset> => {
      const existingPreset = id
        ? storedPresets.find((preset) => preset.id === id)
        : undefined;
      const preset: ModelPreset = {
        id: existingPreset?.id ?? `preset-${storedPresets.length + 1}`,
        name: name.trim(),
        modelId,
        requestSettings,
        createdAtUtcMs: existingPreset?.createdAtUtcMs ?? Date.now(),
        updatedAtUtcMs: Date.now(),
      };
      storedPresets = existingPreset
        ? storedPresets.map((storedPreset) =>
            storedPreset.id === preset.id ? preset : storedPreset,
          )
        : [preset, ...storedPresets];
      presetSubscribers.forEach((subscriber) => subscriber());
      return preset;
    };
    savePreset = vi.fn(upsertPreset);
    savePresetDebounced = vi.fn(upsertPreset);
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
      savePreset,
      savePresetDebounced,
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
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      const body = url.endsWith("/endpoints")
        ? { data: { endpoints: MOCK_ENDPOINTS } }
        : createModelsResponse(models);
      return new Response(JSON.stringify(body), { status: 200 });
    });
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
    await userEvent
      .setup()
      .click(
        await screen.findByRole("button", {
          name: "Search and configure a model",
        }),
      );
    await screen.findByLabelText("Search models");
  };

  const openModel = async (modelName: string) => {
    await openBrowseModels();
    await userEvent.setup().click(await screen.findByText(modelName));
  };

  it("does not render while closed", () => {
    mockModels();
    renderModal({ isOpen: false });

    expect(screen.queryByText("Configure setup")).not.toBeInTheDocument();
  });

  it("opens with current, add, and saved preset sections in order", async () => {
    mockModels();
    renderModal();

    expect(await screen.findByText("Configure setup")).toBeInTheDocument();
    const currentSection = screen.getByText("Current model");
    const addSection = screen.getByText("Add new model");
    const presetsSection = screen.getByText("Saved presets");
    expect(currentSection.compareDocumentPosition(addSection)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(addSection.compareDocumentPosition(presetsSection)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.queryByLabelText("Search models")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Search and configure a model" }),
    ).toBeInTheDocument();
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

  it("returns to other models without committing the draft", async () => {
    mockModels();
    const onSelect = vi.fn();
    renderModal({ onSelect });
    const user = userEvent.setup();
    await openModel("GPT-4");

    await user.click(
      screen.getByRole("button", { name: "Back to model search" }),
    );

    expect(screen.getByLabelText("Search models")).toBeInTheDocument();
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

  it("highlights the current model at the top of the list", async () => {
    mockModels();
    renderModal({
      selectedModelId: "openai/gpt-4",
      selectedRequestSettings: { temperature: 0.6 },
    });

    expect(await screen.findByText("Configure setup")).toBeInTheDocument();
    const currentModelButton = await screen.findByRole("button", {
      name: /GPT-4.*Active/,
    });
    expect(currentModelButton).toHaveTextContent("Active");
    expect(screen.getAllByText("GPT-4")).toHaveLength(1);
    expect(screen.queryByLabelText("Temperature")).not.toBeInTheDocument();
  });

  it("opens the current model with its active configuration", async () => {
    mockModels();
    renderModal({
      selectedModelId: "openai/gpt-4",
      selectedRequestSettings: { temperature: 0.6 },
    });
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", {
        name: /GPT-4.*Active/,
      }),
    );

    expect(await screen.findByLabelText("Temperature")).toHaveValue("0.6");
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("reopens an active preset as the saved preset", async () => {
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
    renderModal({
      selectedModelId: "openai/gpt-4",
      selectedRequestSettings: { temperature: 0.2 },
    });
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /Focused.*Active/ }),
    );

    expect(await screen.findByLabelText("Editing saved preset")).toBeVisible();
    expect(screen.getByLabelText("Preset name for GPT-4")).toHaveValue(
      "Focused",
    );
    expect(screen.getByLabelText("Temperature")).toHaveValue("0.2");
    expect(savePresetDebounced).not.toHaveBeenCalled();
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
      await screen.findByRole("button", {
        name: /GPT-4.*Active/,
      }),
    );
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

  it("shows provider pricing and applies only selected providers", async () => {
    mockModels();
    const onSelect = vi.fn();
    renderModal({ onSelect });
    const user = userEvent.setup();
    await openModel("GPT-4");

    await user.click(
      await screen.findByLabelText("Advanced settings for GPT-4"),
    );
    expect(screen.getByText("Enable all providers")).toBeInTheDocument();
    expect(screen.queryByText("azure")).not.toBeInTheDocument();
    const providerToggle = screen.getByLabelText("Provider routing for GPT-4");
    await waitFor(() => expect(providerToggle).toBeEnabled());
    await user.click(providerToggle);

    expect(screen.getByText("Only selected providers")).toBeInTheDocument();
    expect(screen.getByText("azure")).toBeInTheDocument();
    expect(screen.getByText("openai")).toBeInTheDocument();
    const bestInputPrice = screen.getByLabelText("Input price $0.15");
    expect(bestInputPrice).toHaveAttribute("title", "Best available");
    expect(bestInputPrice.style.background).not.toBe("");
    expect(screen.getByLabelText("Input price $0.20")).toHaveAttribute(
      "title",
      "33.3% above best",
    );
    expect(screen.getByLabelText("Uptime 99.92%")).toHaveAttribute(
      "title",
      "0.1% below best",
    );

    await user.click(screen.getByLabelText("Enable provider openai"));
    await user.click(screen.getByRole("button", { name: "Use this setup" }));

    expect(onSelect).toHaveBeenCalledWith("openai/gpt-4", {
      provider: { only: ["azure"] },
    });
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
    expect(
      screen.getByRole("button", { name: "Save as new" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Update preset" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Editing saved preset")).toHaveStyle({
      borderColor: "rgba(250, 176, 5, 0.72)",
    });
    expect(screen.getByText("Editing preset")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use this setup" }));

    expect(onSelect).toHaveBeenCalledWith("openai/gpt-4", {
      temperature: 0.2,
    });
    expect(savePreset).not.toHaveBeenCalled();
    expect(savePresetDebounced).not.toHaveBeenCalled();
  });

  it("automatically updates a saved preset in place", async () => {
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
    renderModal();
    const user = userEvent.setup();

    await user.click(await screen.findByText("Focused"));
    await user.clear(screen.getByLabelText("Temperature"));
    await user.type(screen.getByLabelText("Temperature"), "0.7");
    await user.clear(screen.getByLabelText("Preset name for GPT-4"));
    await user.type(
      screen.getByLabelText("Preset name for GPT-4"),
      "Focused revision",
    );

    await waitFor(() =>
      expect(savePresetDebounced).toHaveBeenLastCalledWith({
        id: "preset-1",
        name: "Focused revision",
        modelId: "openai/gpt-4",
        requestSettings: { temperature: 0.7 },
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Back to model list" }),
    );
    expect(await screen.findByText("Focused revision")).toBeInTheDocument();
    expect(screen.getByText("1 saved")).toBeInTheDocument();
  });

  it("saves a copy of an existing preset as new", async () => {
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
    renderModal();
    const user = userEvent.setup();

    await user.click(await screen.findByText("Focused"));
    await user.click(screen.getByRole("button", { name: "Save as new" }));

    expect(savePreset).toHaveBeenCalledWith({
      name: "Focused",
      modelId: "openai/gpt-4",
      requestSettings: { temperature: 0.2 },
    });
    await user.click(
      screen.getByRole("button", { name: "Back to model list" }),
    );
    expect(await screen.findByText("2 saved")).toBeInTheDocument();
  });

  it("saves the current draft as a reusable setup", async () => {
    mockModels();
    renderModal({ selectedModelId: "openai/gpt-4" });
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", {
        name: /GPT-4.*Active/,
      }),
    );
    await user.type(
      await screen.findByLabelText("Preset name for GPT-4"),
      "Creative draft",
    );
    await user.click(screen.getByRole("button", { name: "Save as new" }));
    await user.click(
      screen.getByRole("button", { name: "Back to model list" }),
    );

    expect(await screen.findByText("1 saved")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Creative draft.*Active/ }),
    ).toBeInTheDocument();
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

  it("keeps recently used models out of the saved preset list", async () => {
    localStorage.setItem(
      "story-vault-recent-models",
      JSON.stringify(["openai/gpt-4"]),
    );
    mockModels();
    renderModal();

    expect(await screen.findByText("Saved presets")).toBeInTheDocument();
    expect(screen.getByText("No saved presets yet.")).toBeInTheDocument();
    expect(screen.queryByText("Recently used")).not.toBeInTheDocument();
    expect(screen.queryByText("GPT-4")).not.toBeInTheDocument();
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

    expect(await screen.findByText("Configure setup")).toBeInTheDocument();
    await openBrowseModels();
    expect(await screen.findByText("0 models available")).toBeInTheDocument();
    expect(screen.getByLabelText("Search models")).toBeInTheDocument();
  });
});
