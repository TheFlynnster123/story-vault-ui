import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  RiAddLine,
  RiArrowLeftLine,
  RiArrowRightSLine,
  RiDeleteBinLine,
  RiRobot2Line,
} from "react-icons/ri";
import { d } from "../../../services/Dependencies";
import {
  useOpenRouterModelEndpoints,
  useOpenRouterModels,
} from "../../OpenRouter/hooks/useOpenRouterModels";
import type {
  OpenRouterModel,
  OpenRouterModelEndpoint,
} from "../../OpenRouter/services/OpenRouterModelsAPI";
import {
  OPENROUTER_REASONING_EFFORTS,
  type OpenRouterReasoningEffort,
} from "../../OpenRouter/services/OpenRouterReasoning";
import {
  DEFAULT_RETRY_SETTINGS,
  filterSettingsForModel,
  hasOpenRouterRequestSettings,
  supportsParameter,
  type OpenRouterRequestSettings,
} from "../../OpenRouter/services/OpenRouterRequestSettings";
import type {
  ModelPreset,
  SaveModelPreset,
} from "../services/ModelPresetsService";
import {
  getRelativeMetricDifference,
  getRelativeMetricHue,
  type MetricPreference,
} from "./RelativeMetricColor";

const RECOMMENDED_MODEL_IDS = new Set([
  "deepseek/deepseek-v3.2-speciale",
  "deepseek/deepseek-v3.2",
  "anthropic/claude-sonnet-4.6",
  "meituan/longcat-flash-chat",
  "moonshotai/kimi-k2.5",
  "z-ai/glm-5-turbo",
  "z-ai/glm-5",
  "qwen/qwen3.5-122b-a10b",
  "writer/palmyra-x5",
]);

const REASONING_LABELS: Record<OpenRouterReasoningEffort, string> = {
  none: "None",
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "X-High",
};

const NUMBER_PARAMETERS = [
  {
    key: "temperature",
    label: "Temperature",
    description:
      "Controls randomness. 0 is consistent, 0.7–1 is balanced, and higher values are more surprising.",
    min: 0,
    max: 2,
    step: 0.1,
    placeholder: "1.0",
    basic: true,
  },
  {
    key: "top_p",
    label: "Top P",
    description:
      "Limits the pool of likely words. 0.8–1 is typical; tune this or Temperature, not usually both.",
    min: 0,
    max: 1,
    step: 0.05,
    placeholder: "1.0",
  },
  {
    key: "top_k",
    label: "Top K",
    description:
      "Limits choices to the K most likely words. 0 uses the full vocabulary; 20–100 is a common focused range.",
    min: 0,
    step: 1,
    placeholder: "Auto",
  },
  {
    key: "max_tokens",
    label: "Max Tokens",
    description:
      "Caps response length. About 1,000 is short and 4,000+ allows detailed output. Blank uses the provider default.",
    min: 1,
    step: 1,
    placeholder: "Auto",
  },
  {
    key: "frequency_penalty",
    label: "Frequency Penalty",
    description:
      "Discourages repeatedly using the same words. 0 is neutral; 0.2–0.8 usually adds variety.",
    min: -2,
    max: 2,
    step: 0.1,
    placeholder: "0",
  },
  {
    key: "presence_penalty",
    label: "Presence Penalty",
    description:
      "Encourages introducing new topics. 0 is neutral; 0.2–0.8 is a typical exploratory range.",
    min: -2,
    max: 2,
    step: 0.1,
    placeholder: "0",
  },
  {
    key: "repetition_penalty",
    label: "Repetition Penalty",
    description:
      "Reduces repeated phrases. 1 is neutral; values around 1.05–1.2 are a common starting range.",
    min: 0,
    max: 2,
    step: 0.05,
    placeholder: "1.0",
  },
  {
    key: "seed",
    label: "Seed",
    description:
      "Reuses a random starting point for more repeatable results. Leave blank for a new result each time.",
    min: 0,
    step: 1,
    placeholder: "Random",
  },
] as const;

type PickerScreen = "home" | "browse" | "detail";
type DraftSource = "current" | "preset" | "model";

interface ModelDraft {
  modelId: string;
  name: string;
  source: DraftSource;
  presetId?: string;
  requestSettings?: OpenRouterRequestSettings;
}

const getPresetSnapshot = (preset: SaveModelPreset): string =>
  JSON.stringify({
    id: preset.id,
    name: preset.name.trim(),
    modelId: preset.modelId,
    requestSettings: preset.requestSettings,
  });

const useMobileViewport = (): boolean => {
  const query = "(max-width: 48em)";
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      (window.matchMedia(query)?.matches ?? false),
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia(query);
    if (!mediaQuery) return;
    const updateViewport = () => setIsMobile(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  return isMobile;
};

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModelId: string | undefined;
  allowAdvancedSettings?: boolean;
  selectedRequestSettings?: OpenRouterRequestSettings;
  onSelect: (
    modelId: string,
    requestSettings?: OpenRouterRequestSettings,
  ) => void;
}

const formatContextLength = (contextLength?: number): string => {
  if (!contextLength) return "Unknown context";
  if (contextLength >= 1_000_000) {
    return `${(contextLength / 1_000_000).toFixed(1)}M context`;
  }
  if (contextLength >= 1_000) {
    return `${Math.round(contextLength / 1_000)}K context`;
  }
  return `${contextLength} context`;
};

const formatPrice = (price?: string): string => {
  if (!price) return "—";
  const perMillion = Number(price) * 1_000_000;
  if (!Number.isFinite(perMillion)) return "—";
  if (perMillion < 0.01) return "Free";
  return `$${perMillion.toFixed(2)}`;
};

const formatUptime = (uptime?: number | null): string =>
  typeof uptime === "number" ? `${uptime.toFixed(2)}%` : "—";

const parsePricePerMillion = (price?: string): number | undefined => {
  if (!price) return undefined;
  const value = Number(price);
  return Number.isFinite(value) ? value * 1_000_000 : undefined;
};

const getBestValue = (
  values: Array<number | undefined>,
  preference: MetricPreference,
): number | undefined => {
  const availableValues = values.filter(
    (value): value is number => value !== undefined,
  );
  if (availableValues.length === 0) return undefined;
  return preference === "lower"
    ? Math.min(...availableValues)
    : Math.max(...availableValues);
};

const RelativeMetric: React.FC<{
  label: string;
  displayValue: string;
  value?: number;
  bestValue?: number;
  preference: MetricPreference;
}> = ({ label, displayValue, value, bestValue, preference }) => {
  const hue = getRelativeMetricHue(value, bestValue, preference);
  const relativeDifference = getRelativeMetricDifference(
    value,
    bestValue,
    preference,
  );
  const comparison =
    relativeDifference === undefined
      ? "Comparison unavailable"
      : relativeDifference === 0
        ? "Best available"
        : `${(relativeDifference * 100).toFixed(1)}% ${
            preference === "lower" ? "above" : "below"
          } best`;

  return (
    <Text
      component="span"
      size="xs"
      c={hue === undefined ? "dimmed" : undefined}
      aria-label={`${label} ${displayValue}`}
      title={comparison}
      style={
        hue === undefined
          ? undefined
          : {
              padding: "1px 5px",
              borderRadius: 5,
              color: `hsl(${hue}, 72%, 72%)`,
              background: `hsla(${hue}, 70%, 45%, 0.14)`,
              border: `1px solid hsla(${hue}, 65%, 55%, 0.3)`,
            }
      }
    >
      {displayValue}
    </Text>
  );
};

const matchesSearch = (model: OpenRouterModel, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return (
    model.name.toLowerCase().includes(normalizedQuery) ||
    model.id.toLowerCase().includes(normalizedQuery) ||
    (model.description?.toLowerCase().includes(normalizedQuery) ?? false)
  );
};

const deduplicateModels = (models: OpenRouterModel[]): OpenRouterModel[] => {
  const seenIds = new Set<string>();
  return models.filter((model) => {
    if (!model.id || !model.name || seenIds.has(model.id)) return false;
    seenIds.add(model.id);
    return true;
  });
};

const getRequestSettingsSnapshot = (
  settings: OpenRouterRequestSettings | undefined,
  model: OpenRouterModel,
): string => {
  const filteredSettings = filterSettingsForModel(settings, model);
  if (!filteredSettings) return "";

  return JSON.stringify({
    ...filteredSettings,
    provider: filteredSettings.provider
      ? { only: [...filteredSettings.provider.only].sort() }
      : undefined,
  });
};

const findMatchingPreset = (
  presets: ModelPreset[],
  model: OpenRouterModel,
  requestSettings: OpenRouterRequestSettings | undefined,
): ModelPreset | undefined => {
  const activeSettings = getRequestSettingsSnapshot(requestSettings, model);
  return presets.find(
    (preset) =>
      preset.modelId === model.id &&
      getRequestSettingsSnapshot(preset.requestSettings, model) ===
        activeSettings,
  );
};

const updateRequestSetting = (
  settings: OpenRouterRequestSettings | undefined,
  key: keyof OpenRouterRequestSettings,
  value: OpenRouterRequestSettings[keyof OpenRouterRequestSettings],
): OpenRouterRequestSettings | undefined => {
  const updatedSettings = { ...(settings ?? {}) };
  if (value === undefined) {
    delete updatedSettings[key];
  } else {
    (updatedSettings as Record<string, unknown>)[key] = value;
  }
  return Object.keys(updatedSettings).length > 0 ? updatedSettings : undefined;
};

const ModelListItem: React.FC<{
  model: OpenRouterModel;
  label?: string;
  active?: boolean;
  configured?: boolean;
  onClick: () => void;
  onDelete?: () => void;
}> = ({ model, label, active, configured, onClick, onDelete }) => (
  <Paper
    component="div"
    withBorder
    onClick={onClick}
    onKeyDown={(event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onClick();
    }}
    role="button"
    tabIndex={0}
    p="sm"
    w="100%"
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      minHeight: 68,
      borderColor: active
        ? "rgba(109, 142, 245, 0.5)"
        : "rgba(255,255,255,0.1)",
      background: active
        ? "rgba(109, 142, 245, 0.14)"
        : "rgba(255,255,255,0.025)",
      color: "inherit",
      cursor: "pointer",
      textAlign: "left",
    }}
  >
    <Box
      style={{
        display: "grid",
        placeItems: "center",
        width: 38,
        height: 38,
        flex: "0 0 38px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.06)",
        color: "#90acff",
      }}
    >
      <RiRobot2Line size={18} />
    </Box>
    <Box style={{ flex: 1, minWidth: 0 }}>
      <Group gap={6} wrap="nowrap">
        <Text size="sm" fw={650} truncate>
          {label ?? model.name}
        </Text>
        {active && (
          <Badge size="xs" color="teal" variant="light">
            Active
          </Badge>
        )}
      </Group>
      <Text size="xs" c="dimmed" truncate mt={2}>
        {label ? model.name : model.id}
        {configured ? " · Customized" : ""}
      </Text>
    </Box>
    {onDelete && (
      <ActionIcon
        variant="subtle"
        color="gray"
        aria-label={`Delete preset ${label}`}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        <RiDeleteBinLine />
      </ActionIcon>
    )}
    <RiArrowRightSLine size={20} color="#707583" />
  </Paper>
);

const deduplicateEndpoints = (
  endpoints: OpenRouterModelEndpoint[],
): OpenRouterModelEndpoint[] => {
  const endpointsByTag = new Map<string, OpenRouterModelEndpoint>();
  for (const endpoint of endpoints) {
    if (endpoint.tag && !endpointsByTag.has(endpoint.tag)) {
      endpointsByTag.set(endpoint.tag, endpoint);
    }
  }
  return [...endpointsByTag.values()].sort((left, right) =>
    left.provider_name.localeCompare(right.provider_name),
  );
};

const ProviderRoutingSettings: React.FC<{
  model: OpenRouterModel;
  settings?: OpenRouterRequestSettings;
  onChange: (settings: OpenRouterRequestSettings | undefined) => void;
}> = ({ model, settings, onChange }) => {
  const { endpoints, isLoading, isError } = useOpenRouterModelEndpoints(
    model.id,
  );
  const uniqueEndpoints = useMemo(
    () => deduplicateEndpoints(endpoints),
    [endpoints],
  );
  const selectedTags = settings?.provider?.only;
  const enableAllProviders = selectedTags === undefined;
  const lastManualSelection = useRef<{
    modelId: string;
    tags: string[];
  } | undefined>(undefined);
  useEffect(() => {
    if (selectedTags) {
      lastManualSelection.current = {
        modelId: model.id,
        tags: [...selectedTags],
      };
    } else if (lastManualSelection.current?.modelId !== model.id) {
      lastManualSelection.current = undefined;
    }
  }, [model.id, selectedTags]);
  const availableTags = useMemo(
    () => new Set(uniqueEndpoints.map((endpoint) => endpoint.tag)),
    [uniqueEndpoints],
  );
  const unavailableSelectedTags = (selectedTags ?? []).filter(
    (tag) => !availableTags.has(tag),
  );
  const bestPromptPrice = getBestValue(
    uniqueEndpoints.map((endpoint) =>
      parsePricePerMillion(endpoint.pricing?.prompt),
    ),
    "lower",
  );
  const bestCompletionPrice = getBestValue(
    uniqueEndpoints.map((endpoint) =>
      parsePricePerMillion(endpoint.pricing?.completion),
    ),
    "lower",
  );
  const bestUptime = getBestValue(
    uniqueEndpoints.map((endpoint) => endpoint.uptime_last_1d ?? undefined),
    "higher",
  );

  const changeProviders = (only: string[] | undefined) =>
    onChange(
      updateRequestSetting(settings, "provider", only ? { only } : undefined),
    );

  const toggleProvider = (tag: string, checked: boolean) => {
    const currentTags =
      selectedTags ?? uniqueEndpoints.map((endpoint) => endpoint.tag);
    const nextTags = checked
      ? [...new Set([...currentTags, tag])]
      : currentTags.filter((currentTag) => currentTag !== tag);
    changeProviders(nextTags);
  };

  const toggleAllProviders = (checked: boolean) => {
    if (checked) {
      changeProviders(undefined);
      return;
    }

    const rememberedSelection =
      lastManualSelection.current?.modelId === model.id
        ? lastManualSelection.current.tags
        : undefined;
    changeProviders(
      rememberedSelection ?? uniqueEndpoints.map((endpoint) => endpoint.tag),
    );
  };

  return (
    <Stack gap="sm">
      <Box>
        <Text size="sm" fw={650}>
          Model providers
        </Text>
        <Text size="xs" c="dimmed">
          Enable every endpoint, or restrict this setup to selected providers.
          Turn off the toggle to choose providers manually. Prices are per
          million tokens; uptime is measured over the last day.
        </Text>
      </Box>
      <Switch
        aria-label={`Provider routing for ${model.name}`}
        checked={enableAllProviders}
        onChange={(event) => toggleAllProviders(event.currentTarget.checked)}
        label={
          enableAllProviders
            ? "Enable all providers"
            : "Only selected providers"
        }
        disabled={
          enableAllProviders &&
          (isLoading || isError || uniqueEndpoints.length === 0)
        }
      />

      {!enableAllProviders && isLoading && (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">
            Loading provider pricing and uptime...
          </Text>
        </Group>
      )}
      {!enableAllProviders && isError && (
        <Text size="xs" c="red">
          Provider details are unavailable. Any existing routing selection is
          unchanged.
        </Text>
      )}
      {!enableAllProviders && uniqueEndpoints.length > 0 && (
        <Stack gap="xs">
          {uniqueEndpoints.map((endpoint) => (
            <Paper key={endpoint.tag} withBorder p="sm">
              <Checkbox
                aria-label={`Enable provider ${endpoint.tag}`}
                checked={selectedTags?.includes(endpoint.tag) ?? false}
                onChange={(event) =>
                  toggleProvider(endpoint.tag, event.currentTarget.checked)
                }
                label={
                  <Box>
                    <Group gap="xs">
                      <Text size="sm" fw={600}>
                        {endpoint.provider_name}
                      </Text>
                      <Badge size="xs" variant="outline" color="gray">
                        {endpoint.tag}
                      </Badge>
                    </Group>
                    <Group gap={5} mt={4} wrap="wrap">
                      <Text component="span" size="xs" c="dimmed">
                        Input
                      </Text>
                      <RelativeMetric
                        label="Input price"
                        displayValue={formatPrice(endpoint.pricing?.prompt)}
                        value={parsePricePerMillion(endpoint.pricing?.prompt)}
                        bestValue={bestPromptPrice}
                        preference="lower"
                      />
                      <Text component="span" size="xs" c="dimmed">
                        Output
                      </Text>
                      <RelativeMetric
                        label="Output price"
                        displayValue={formatPrice(endpoint.pricing?.completion)}
                        value={parsePricePerMillion(
                          endpoint.pricing?.completion,
                        )}
                        bestValue={bestCompletionPrice}
                        preference="lower"
                      />
                      <Text component="span" size="xs" c="dimmed">
                        Uptime
                      </Text>
                      <RelativeMetric
                        label="Uptime"
                        displayValue={formatUptime(endpoint.uptime_last_1d)}
                        value={endpoint.uptime_last_1d ?? undefined}
                        bestValue={bestUptime}
                        preference="higher"
                      />
                    </Group>
                  </Box>
                }
              />
            </Paper>
          ))}
          {unavailableSelectedTags.map((tag) => (
            <Paper key={tag} withBorder p="sm">
              <Checkbox
                aria-label={`Enable provider ${tag}`}
                checked
                onChange={(event) =>
                  toggleProvider(tag, event.currentTarget.checked)
                }
                label={
                  <Box>
                    <Group gap="xs">
                      <Text size="sm" fw={600}>
                        Unavailable provider
                      </Text>
                      <Badge size="xs" variant="outline" color="gray">
                        {tag}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" mt={2}>
                      OpenRouter no longer returns details for this endpoint.
                    </Text>
                  </Box>
                }
              />
            </Paper>
          ))}
          {selectedTags?.length === 0 && (
            <Text size="xs" c="red">
              Select at least one provider before applying this setup.
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
};

const RequestSettingsForm: React.FC<{
  model: OpenRouterModel;
  settings?: OpenRouterRequestSettings;
  onChange: (settings: OpenRouterRequestSettings | undefined) => void;
}> = ({ model, settings, onChange }) => {
  const changeSetting = (
    key: keyof OpenRouterRequestSettings,
    value: OpenRouterRequestSettings[keyof OpenRouterRequestSettings],
  ) => onChange(updateRequestSetting(settings, key, value));

  const basicParameters = NUMBER_PARAMETERS.filter(
    (parameter) =>
      "basic" in parameter &&
      parameter.basic &&
      supportsParameter(model, parameter.key),
  );
  const advancedParameters = NUMBER_PARAMETERS.filter(
    (parameter) =>
      !("basic" in parameter && parameter.basic) &&
      supportsParameter(model, parameter.key),
  );

  const renderNumberInput = (parameter: (typeof NUMBER_PARAMETERS)[number]) => (
    <NumberInput
      key={parameter.key}
      label={parameter.label}
      description={parameter.description}
      aria-label={parameter.label}
      value={settings?.[parameter.key] ?? ""}
      min={parameter.min}
      max={"max" in parameter ? parameter.max : undefined}
      step={parameter.step}
      placeholder={parameter.placeholder}
      onChange={(value) =>
        changeSetting(parameter.key, value === "" ? undefined : Number(value))
      }
    />
  );

  return (
    <Stack gap="md">
      {supportsParameter(model, "reasoning") && (
        <Select
          label="Reasoning effort"
          description="Higher effort may improve difficult work but costs more time and tokens."
          aria-label={`Reasoning level for ${model.name}`}
          value={settings?.reasoning?.effort ?? ""}
          data={[
            { value: "", label: "Auto" },
            ...OPENROUTER_REASONING_EFFORTS.map((effort) => ({
              value: effort,
              label: REASONING_LABELS[effort],
            })),
          ]}
          onChange={(value) =>
            changeSetting(
              "reasoning",
              value
                ? { effort: value as OpenRouterReasoningEffort }
                : undefined,
            )
          }
        />
      )}
      {basicParameters.map(renderNumberInput)}

      <Accordion variant="separated">
        <Accordion.Item value="advanced">
          <Accordion.Control aria-label={`Advanced settings for ${model.name}`}>
            <Group gap="xs">
              <Text size="sm" fw={650}>
                Advanced settings
              </Text>
              {hasOpenRouterRequestSettings(settings) && (
                <Badge size="xs" variant="light">
                  Customized
                </Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  Only settings supported by this model are shown.
                </Text>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color="gray"
                  onClick={() => onChange(undefined)}
                >
                  Reset
                </Button>
              </Group>

              <ProviderRoutingSettings
                model={model}
                settings={settings}
                onChange={onChange}
              />

              <Checkbox
                label="Retry failed requests"
                description="Retry transient network, timeout, rate-limit, and provider errors."
                aria-label="Enable retries"
                checked={settings?.retry !== undefined}
                onChange={(event) =>
                  changeSetting(
                    "retry",
                    event.currentTarget.checked
                      ? { ...DEFAULT_RETRY_SETTINGS }
                      : undefined,
                  )
                }
              />
              {settings?.retry && (
                <>
                  <NumberInput
                    label="Retry delay in seconds"
                    description="Use 0 to retry immediately."
                    value={settings.retry.retryDelaySeconds ?? ""}
                    min={0}
                    step={1}
                    onChange={(value) =>
                      changeSetting("retry", {
                        ...settings.retry,
                        retryDelaySeconds:
                          value === ""
                            ? undefined
                            : Math.max(0, Math.round(Number(value))),
                      })
                    }
                  />
                  <NumberInput
                    label="Number of Retries"
                    description="Additional attempts after the first request fails."
                    value={settings.retry.numberOfRetries ?? ""}
                    min={1}
                    step={1}
                    onChange={(value) =>
                      changeSetting("retry", {
                        ...settings.retry,
                        numberOfRetries:
                          value === ""
                            ? undefined
                            : Math.max(1, Math.round(Number(value))),
                      })
                    }
                  />
                </>
              )}
              {advancedParameters.map(renderNumberInput)}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
};

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedModelId,
  allowAdvancedSettings = true,
  selectedRequestSettings,
  onSelect,
}) => {
  const { models, isLoading } = useOpenRouterModels();
  const isMobile = useMobileViewport();
  const recentModelsService = useRef(d.RecentModelsService()).current;
  const modelPresetsService = useRef(d.ModelPresetsService()).current;
  const [screen, setScreen] = useState<PickerScreen>("home");
  const [search, setSearch] = useState("");
  const [presets, setPresets] = useState<ModelPreset[]>([]);
  const [draft, setDraft] = useState<ModelDraft>();
  const [presetName, setPresetName] = useState("");
  const presetAutosaveSnapshot = useRef<string | undefined>(undefined);

  const uniqueModels = useMemo(() => deduplicateModels(models), [models]);
  const modelsById = useMemo(
    () => new Map(uniqueModels.map((model) => [model.id, model])),
    [uniqueModels],
  );
  const selectedModel = selectedModelId
    ? modelsById.get(selectedModelId)
    : undefined;
  const activePreset = useMemo(
    () =>
      selectedModel
        ? findMatchingPreset(presets, selectedModel, selectedRequestSettings)
        : undefined,
    [presets, selectedModel, selectedRequestSettings],
  );
  const recommendedModels = useMemo(
    () =>
      uniqueModels.filter(
        (model) =>
          model.id !== selectedModelId && RECOMMENDED_MODEL_IDS.has(model.id),
      ),
    [selectedModelId, uniqueModels],
  );
  const filteredModels = useMemo(
    () =>
      uniqueModels
        .filter((model) => model.id !== selectedModelId)
        .filter((model) => matchesSearch(model, search))
        .filter(
          (model) =>
            search.trim().length > 0 || !RECOMMENDED_MODEL_IDS.has(model.id),
        )
        .sort((left, right) => left.name.localeCompare(right.name)),
    [search, selectedModelId, uniqueModels],
  );
  const draftModel = draft ? modelsById.get(draft.modelId) : undefined;
  const hasValidProviderSelection =
    !draft?.requestSettings?.provider ||
    draft.requestSettings.provider.only.length > 0;

  const loadPresets = useCallback(async () => {
    setPresets(await modelPresetsService.getPresets());
  }, [modelPresetsService]);

  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setPresetName("");
    setDraft(undefined);
    presetAutosaveSnapshot.current = undefined;
    setScreen("home");
  }, [isOpen, selectedModelId, selectedRequestSettings]);

  useEffect(() => {
    if (!isOpen) return;
    void loadPresets();
    return modelPresetsService.subscribe(() => {
      void loadPresets();
    });
  }, [isOpen, loadPresets, modelPresetsService]);

  const showDraft = useCallback(
    (
      modelId: string,
      name: string,
      source: DraftSource,
      requestSettings?: OpenRouterRequestSettings,
      presetId?: string,
    ) => {
      const model = modelsById.get(modelId);
      const filteredRequestSettings = filterSettingsForModel(
        requestSettings,
        model,
      );
      setDraft({
        modelId,
        name,
        source,
        presetId,
        requestSettings: filteredRequestSettings,
      });
      setPresetName(source === "current" ? "" : name);
      presetAutosaveSnapshot.current =
        source === "preset" && presetId
          ? getPresetSnapshot({
              id: presetId,
              name,
              modelId,
              requestSettings: filteredRequestSettings,
            })
          : undefined;
      setScreen("detail");
    },
    [modelsById],
  );

  useEffect(() => {
    if (
      draft?.source !== "preset" ||
      !draft.presetId ||
      !presetName.trim() ||
      !hasValidProviderSelection
    ) {
      return;
    }

    const preset: SaveModelPreset = {
      id: draft.presetId,
      name: presetName,
      modelId: draft.modelId,
      requestSettings: filterSettingsForModel(
        draft.requestSettings,
        draftModel,
      ),
    };
    const snapshot = getPresetSnapshot(preset);
    if (snapshot === presetAutosaveSnapshot.current) return;

    presetAutosaveSnapshot.current = snapshot;
    void modelPresetsService.savePresetDebounced(preset).catch((error) => {
      if (presetAutosaveSnapshot.current === snapshot) {
        presetAutosaveSnapshot.current = undefined;
      }
      d.ErrorService().log("Failed to auto-save model preset", error);
    });
  }, [
    draft,
    draftModel,
    hasValidProviderSelection,
    modelPresetsService,
    presetName,
  ]);

  const applyDraft = useCallback(() => {
    if (!draft) return;
    const requestSettings = filterSettingsForModel(
      draft.requestSettings,
      draftModel,
    );
    recentModelsService.trackModel(draft.modelId);
    onSelect(draft.modelId, requestSettings);
    onClose();
  }, [draft, draftModel, onClose, onSelect, recentModelsService]);

  const saveDraftAsNew = useCallback(async () => {
    if (!draft || !presetName.trim()) return;
    await modelPresetsService.savePreset({
      name: presetName,
      modelId: draft.modelId,
      requestSettings: filterSettingsForModel(
        draft.requestSettings,
        draftModel,
      ),
    });
    await loadPresets();
  }, [draft, draftModel, loadPresets, modelPresetsService, presetName]);

  const deletePreset = useCallback(
    async (presetId: string) => {
      await modelPresetsService.deletePreset(presetId);
      await loadPresets();
    },
    [loadPresets, modelPresetsService],
  );

  const showBrowse = () => {
    setSearch("");
    setScreen("browse");
  };
  const showHome = () => setScreen("home");
  const showCurrent = async () => {
    if (!selectedModel) return;
    const matchingPreset =
      activePreset ??
      findMatchingPreset(
        await modelPresetsService.getPresets(),
        selectedModel,
        selectedRequestSettings,
      );
    if (matchingPreset) {
      showDraft(
        matchingPreset.modelId,
        matchingPreset.name,
        "preset",
        matchingPreset.requestSettings,
        matchingPreset.id,
      );
      return;
    }

    showDraft(
      selectedModel.id,
      "Current setup",
      "current",
      selectedRequestSettings,
    );
  };
  const leaveDetail = () => {
    if (draft?.source === "model") {
      setScreen("browse");
      return;
    }
    showHome();
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title="Configure setup"
      fullScreen={isMobile}
      size="lg"
      centered={!isMobile}
      padding={0}
      scrollAreaComponent={ScrollArea.Autosize}
      closeButtonProps={{ "aria-label": "Close" }}
      styles={{
        header: {
          minHeight: 60,
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        },
        title: { fontWeight: 680 },
        body: {
          display: "flex",
          flexDirection: "column",
          height: isMobile ? "calc(100dvh - 60px)" : "min(720px, 78vh)",
        },
        content: { overflow: "hidden" },
      }}
    >
      {screen === "home" && (
        <ScrollArea style={{ flex: 1 }} p="md">
          <Stack gap="lg">
            <Stack gap="xs">
              <Text size="xs" fw={750} c="dimmed" tt="uppercase">
                Current model
              </Text>
              {selectedModel ? (
                <ModelListItem
                  model={selectedModel}
                  label={activePreset?.name}
                  active
                  configured={hasOpenRouterRequestSettings(
                    selectedRequestSettings,
                  )}
                  onClick={() => void showCurrent()}
                />
              ) : (
                <Paper withBorder p="md">
                  <Text size="sm" fw={650}>
                    No model selected
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    The application default is currently in use.
                  </Text>
                </Paper>
              )}
            </Stack>

            <Stack gap="xs">
              <Text size="xs" fw={750} c="dimmed" tt="uppercase">
                Add new model
              </Text>
              <Button
                fullWidth
                size="md"
                variant="light"
                leftSection={<RiAddLine />}
                onClick={showBrowse}
              >
                Search and configure a model
              </Button>
            </Stack>

            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="xs" fw={750} c="dimmed" tt="uppercase">
                  Saved presets
                </Text>
                <Text size="xs" c="dimmed">
                  {presets.length} saved
                </Text>
              </Group>
              {presets.map((preset) => {
                const model = modelsById.get(preset.modelId);
                if (!model) return null;
                return (
                  <ModelListItem
                    key={preset.id}
                    model={model}
                    label={preset.name}
                    configured={hasOpenRouterRequestSettings(
                      preset.requestSettings,
                    )}
                    onClick={() =>
                      showDraft(
                        preset.modelId,
                        preset.name,
                        "preset",
                        preset.requestSettings,
                        preset.id,
                      )
                    }
                    onDelete={() => void deletePreset(preset.id)}
                  />
                );
              })}
              {presets.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  No saved presets yet.
                </Text>
              )}
            </Stack>
          </Stack>
        </ScrollArea>
      )}
      {screen === "browse" && (
        <>
          <Box
            p="sm"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
          >
            <Stack gap="sm">
              <Group gap="xs">
                <Button
                  size="compact-sm"
                  variant="subtle"
                  color="gray"
                  leftSection={<RiArrowLeftLine />}
                  onClick={showHome}
                >
                  Back to model list
                </Button>
                <Title order={4}>Add new model</Title>
              </Group>
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search models by name, ID, or description..."
                aria-label="Search models"
              />
            </Stack>
          </Box>
          <ScrollArea style={{ flex: 1 }} p="sm">
            <Stack gap="md">
              {isLoading && (
                <Group justify="center" p="xl">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">
                    Loading models...
                  </Text>
                </Group>
              )}
              {!search.trim() && recommendedModels.length > 0 && (
                <Stack gap="xs">
                  <Text size="xs" fw={750} c="dimmed" tt="uppercase">
                    Recommended
                  </Text>
                  {recommendedModels.map((model) => (
                    <ModelListItem
                      key={`recommended-${model.id}`}
                      model={model}
                      onClick={() => showDraft(model.id, model.name, "model")}
                    />
                  ))}
                </Stack>
              )}
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="xs" fw={750} c="dimmed" tt="uppercase">
                    {!search.trim() && recommendedModels.length > 0
                      ? "Other models"
                      : "All models"}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {filteredModels.length} model
                    {filteredModels.length === 1 ? "" : "s"} available
                  </Text>
                </Group>
                {filteredModels.map((model) => (
                  <ModelListItem
                    key={model.id}
                    model={model}
                    onClick={() => showDraft(model.id, model.name, "model")}
                  />
                ))}
                {!isLoading && filteredModels.length === 0 && (
                  <Text ta="center" c="dimmed" p="xl">
                    No models found matching &quot;{search}&quot;
                  </Text>
                )}
              </Stack>
            </Stack>
          </ScrollArea>
        </>
      )}
      {screen === "detail" && (
        <>
          <ScrollArea style={{ flex: 1 }}>
            <Stack p="md" gap="lg">
              <Button
                style={{ alignSelf: "flex-start" }}
                size="compact-sm"
                variant="subtle"
                color="gray"
                leftSection={<RiArrowLeftLine />}
                onClick={leaveDetail}
              >
                {draft?.source === "model"
                  ? "Back to model search"
                  : "Back to model list"}
              </Button>
              <Paper
                withBorder
                p="md"
                aria-label={
                  draft?.source === "preset" ? "Editing saved preset" : undefined
                }
                style={{
                  borderColor:
                    draft?.source === "current"
                      ? "rgba(53, 209, 188, 0.55)"
                      : draft?.source === "preset"
                        ? "rgba(250, 176, 5, 0.72)"
                        : "rgba(113, 135, 255, 0.42)",
                  background:
                    draft?.source === "current"
                      ? "linear-gradient(135deg, rgba(53, 209, 188, 0.15), rgba(53, 209, 188, 0.035))"
                      : draft?.source === "preset"
                        ? "linear-gradient(135deg, rgba(250, 176, 5, 0.16), rgba(250, 176, 5, 0.035))"
                        : "linear-gradient(135deg, rgba(113, 135, 255, 0.13), rgba(113, 135, 255, 0.035))",
                  boxShadow:
                    draft?.source === "preset"
                      ? "inset 0 0 0 1px rgba(250, 176, 5, 0.12)"
                      : undefined,
                }}
              >
                <Stack gap="xs">
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Title order={3}>{draft?.name}</Title>
                      <Text size="sm" c="dimmed">
                        {draftModel?.name ?? draft?.modelId}
                      </Text>
                    </Box>
                    {draft?.source === "current" && (
                      <Badge color="teal" variant="light">
                        Active
                      </Badge>
                    )}
                    {draft?.source === "preset" && (
                      <Badge color="yellow" variant="light">
                        Editing preset
                      </Badge>
                    )}
                    {draft?.source === "model" && (
                      <Badge color="indigo" variant="light">
                        Preview
                      </Badge>
                    )}
                  </Group>
                  {draftModel && (
                    <Group gap="xs">
                      <Badge variant="outline" color="gray">
                        {formatContextLength(draftModel.context_length)}
                      </Badge>
                      <Badge variant="outline" color="gray">
                        Prompt {formatPrice(draftModel.pricing?.prompt)} / M
                      </Badge>
                      <Badge variant="outline" color="gray">
                        Completion {formatPrice(draftModel.pricing?.completion)}{" "}
                        / M
                      </Badge>
                    </Group>
                  )}
                </Stack>
              </Paper>

              {allowAdvancedSettings && draftModel && (
                <RequestSettingsForm
                  model={draftModel}
                  settings={draft?.requestSettings}
                  onChange={(requestSettings) =>
                    setDraft((current) =>
                      current ? { ...current, requestSettings } : current,
                    )
                  }
                />
              )}
            </Stack>
          </ScrollArea>
          <Paper
            p="sm"
            radius={0}
            style={{
              borderTop: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(24,24,28,0.98)",
            }}
          >
            <Stack gap="xs">
              <Group wrap="nowrap" align="flex-end">
                <TextInput
                  style={{ flex: 1 }}
                  label="Setup name"
                  value={presetName}
                  onChange={(event) => setPresetName(event.currentTarget.value)}
                  placeholder="Name this setup"
                  aria-label={
                    draftModel
                      ? `Preset name for ${draftModel.name}`
                      : "Preset name"
                  }
                />
                <Button
                  variant="default"
                  disabled={!presetName.trim() || !hasValidProviderSelection}
                  onClick={() => void saveDraftAsNew()}
                >
                  Save as new
                </Button>
              </Group>
              <Text size="xs" c="dimmed">
                {draft?.source === "current"
                  ? "This is the model currently used by this chat."
                  : draft?.source === "preset"
                    ? "Changes to this preset save automatically. Save as new creates a copy."
                    : "Preview only. Nothing changes until you apply."}
              </Text>
              <Button
                fullWidth
                size="md"
                disabled={!hasValidProviderSelection}
                onClick={applyDraft}
              >
                Use this setup
              </Button>
            </Stack>
          </Paper>
        </>
      )}
    </Modal>
  );
};
