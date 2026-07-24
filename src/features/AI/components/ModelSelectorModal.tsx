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
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  RiArrowLeftLine,
  RiArrowRightSLine,
  RiDeleteBinLine,
  RiRobot2Line,
} from "react-icons/ri";
import { d } from "../../../services/Dependencies";
import { useOpenRouterModels } from "../../OpenRouter/hooks/useOpenRouterModels";
import type { OpenRouterModel } from "../../OpenRouter/services/OpenRouterModelsAPI";
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
import type { ModelPreset } from "../services/ModelPresetsService";

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

type PickerView = "setups" | "browse";
type PickerScreen = "list" | "detail";

interface ModelDraft {
  modelId: string;
  name: string;
  requestSettings?: OpenRouterRequestSettings;
}

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

const EmptySetups: React.FC<{ onBrowse: () => void }> = ({ onBrowse }) => (
  <Paper withBorder p="xl" ta="center">
    <Stack align="center" gap="xs">
      <RiRobot2Line size={28} color="#90acff" />
      <Text fw={650}>No model setups yet</Text>
      <Text size="sm" c="dimmed">
        Choose a model, tune it if needed, and save it for quick reuse.
      </Text>
      <Button variant="light" mt="xs" onClick={onBrowse}>
        Browse models
      </Button>
    </Stack>
  </Paper>
);

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

  const renderNumberInput = (
    parameter: (typeof NUMBER_PARAMETERS)[number],
  ) => (
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
        changeSetting(
          parameter.key,
          value === "" ? undefined : Number(value),
        )
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
          <Accordion.Control
            aria-label={`Advanced settings for ${model.name}`}
          >
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
  const [view, setView] = useState<PickerView>("setups");
  const [screen, setScreen] = useState<PickerScreen>("list");
  const [search, setSearch] = useState("");
  const [presets, setPresets] = useState<ModelPreset[]>([]);
  const [draft, setDraft] = useState<ModelDraft>();
  const [presetName, setPresetName] = useState("");

  const uniqueModels = useMemo(() => deduplicateModels(models), [models]);
  const modelsById = useMemo(
    () => new Map(uniqueModels.map((model) => [model.id, model])),
    [uniqueModels],
  );
  const selectedModel = selectedModelId
    ? modelsById.get(selectedModelId)
    : undefined;
  const recentModels = useMemo(
    () =>
      recentModelsService
        .getRecentModels()
        .filter((modelId) => modelId !== selectedModelId)
        .map((modelId) => modelsById.get(modelId))
        .filter((model): model is OpenRouterModel => model !== undefined),
    [modelsById, recentModelsService, selectedModelId],
  );
  const recommendedModels = useMemo(
    () =>
      uniqueModels.filter((model) => RECOMMENDED_MODEL_IDS.has(model.id)),
    [uniqueModels],
  );
  const filteredModels = useMemo(
    () =>
      uniqueModels
        .filter((model) => matchesSearch(model, search))
        .filter(
          (model) =>
            search.trim().length > 0 ||
            !RECOMMENDED_MODEL_IDS.has(model.id),
        )
        .sort((left, right) => left.name.localeCompare(right.name)),
    [search, uniqueModels],
  );
  const draftModel = draft ? modelsById.get(draft.modelId) : undefined;

  const loadPresets = useCallback(async () => {
    setPresets(await modelPresetsService.getPresets());
  }, [modelPresetsService]);

  useEffect(() => {
    if (!isOpen) return;
    setView("setups");
    setSearch("");
    setPresetName("");
    if (selectedModelId) {
      setDraft({
        modelId: selectedModelId,
        name: "Current setup",
        requestSettings: selectedRequestSettings,
      });
      setScreen("detail");
    } else {
      setDraft(undefined);
      setScreen("list");
    }
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
      requestSettings?: OpenRouterRequestSettings,
    ) => {
      const model = modelsById.get(modelId);
      setDraft({
        modelId,
        name,
        requestSettings: filterSettingsForModel(requestSettings, model),
      });
      setPresetName(name === "Current setup" ? "" : name);
      setScreen("detail");
    },
    [modelsById],
  );

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

  const saveDraft = useCallback(async () => {
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
  }, [
    draft,
    draftModel,
    loadPresets,
    modelPresetsService,
    presetName,
  ]);

  const deletePreset = useCallback(
    async (presetId: string) => {
      await modelPresetsService.deletePreset(presetId);
      await loadPresets();
    },
    [loadPresets, modelPresetsService],
  );

  const hasSetups =
    selectedModel !== undefined ||
    presets.length > 0 ||
    recentModels.length > 0;
  const title = screen === "detail" ? "Configure setup" : "Select model setup";

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={title}
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
      {screen === "list" ? (
        <>
          <Box p="sm">
            <SegmentedControl
              fullWidth
              value={view}
              onChange={(value) => {
                setView(value as PickerView);
                setSearch("");
              }}
              data={[
                { label: "My setups", value: "setups" },
                { label: "Browse models", value: "browse" },
              ]}
            />
            {view === "browse" && (
              <TextInput
                mt="sm"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search models by name, ID, or description..."
                aria-label="Search models"
              />
            )}
          </Box>
          <Divider />
          <ScrollArea style={{ flex: 1 }} p="sm">
            {view === "setups" ? (
              <Stack gap="sm">
                {!hasSetups && (
                  <EmptySetups onBrowse={() => setView("browse")} />
                )}
                {selectedModel && (
                  <Stack gap="xs">
                    <Text size="xs" fw={750} c="dimmed" tt="uppercase">
                      Current
                    </Text>
                    <ModelListItem
                      model={selectedModel}
                      label="Current setup"
                      active
                      configured={hasOpenRouterRequestSettings(
                        selectedRequestSettings,
                      )}
                      onClick={() =>
                        showDraft(
                          selectedModel.id,
                          "Current setup",
                          selectedRequestSettings,
                        )
                      }
                    />
                  </Stack>
                )}
                {presets.length > 0 && (
                  <Stack gap="xs">
                    <Text size="xs" fw={750} c="dimmed" tt="uppercase">
                      Saved setups
                    </Text>
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
                              preset.requestSettings,
                            )
                          }
                          onDelete={() => void deletePreset(preset.id)}
                        />
                      );
                    })}
                  </Stack>
                )}
                {recentModels.length > 0 && (
                  <Stack gap="xs">
                    <Text size="xs" fw={750} c="dimmed" tt="uppercase">
                      Recently used
                    </Text>
                    {recentModels.map((model) => (
                      <ModelListItem
                        key={model.id}
                        model={model}
                        onClick={() =>
                          showDraft(model.id, model.name)
                        }
                      />
                    ))}
                  </Stack>
                )}
              </Stack>
            ) : (
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
                        onClick={() =>
                          showDraft(model.id, model.name)
                        }
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
                      onClick={() => showDraft(model.id, model.name)}
                    />
                  ))}
                  {!isLoading && filteredModels.length === 0 && (
                    <Text ta="center" c="dimmed" p="xl">
                      No models found matching &quot;{search}&quot;
                    </Text>
                  )}
                </Stack>
              </Stack>
            )}
          </ScrollArea>
        </>
      ) : (
        <>
          <Box px="sm" pt="xs">
            <Button
              variant="subtle"
              color="gray"
              leftSection={<RiArrowLeftLine />}
              onClick={() => setScreen("list")}
              aria-label="Back to model setups"
            >
              Back
            </Button>
          </Box>
          <ScrollArea style={{ flex: 1 }}>
            <Stack p="md" gap="lg">
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Title order={3}>{draft?.name}</Title>
                      <Text size="sm" c="dimmed">
                        {draftModel?.name ?? draft?.modelId}
                      </Text>
                    </Box>
                    {draft?.modelId === selectedModelId && (
                      <Badge color="teal" variant="light">
                        Active
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
                        Completion{" "}
                        {formatPrice(draftModel.pricing?.completion)} / M
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
                  onChange={(event) =>
                    setPresetName(event.currentTarget.value)
                  }
                  placeholder="Name this setup"
                  aria-label={
                    draftModel
                      ? `Preset name for ${draftModel.name}`
                      : "Preset name"
                  }
                />
                <Button
                  variant="default"
                  disabled={!presetName.trim()}
                  onClick={() => void saveDraft()}
                >
                  Save as new
                </Button>
              </Group>
              <Text size="xs" c="dimmed">
                Preview only. Nothing changes until you apply.
              </Text>
              <Button fullWidth size="md" onClick={applyDraft}>
                Use this setup
              </Button>
            </Stack>
          </Paper>
        </>
      )}
    </Modal>
  );
};
