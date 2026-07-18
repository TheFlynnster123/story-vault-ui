import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { GroupedVirtuoso } from "react-virtuoso";
import { useOpenRouterModels } from "../../OpenRouter/hooks/useOpenRouterModels";
import { d } from "../../../services/Dependencies";
import type { OpenRouterModel } from "../../OpenRouter/services/OpenRouterModelsAPI";
import {
  OPENROUTER_REASONING_EFFORTS,
  type OpenRouterReasoningEffort,
} from "../../OpenRouter/services/OpenRouterReasoning";
import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";
import {
  filterSettingsForModel,
  hasOpenRouterRequestSettings,
  supportsParameter,
} from "../../OpenRouter/services/OpenRouterRequestSettings";
import type { ModelPreset } from "../services/ModelPresetsService";

// --- Constants ---

const REDDIT_RECOMMENDED_IDS = new Set([
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

/** Reasonable defaults for color-coding model stats */
const CONTEXT_THRESHOLDS = {
  large: 128_000,
  medium: 32_000,
} as const;

const PRICE_THRESHOLDS = {
  /** per million tokens */
  cheap: 1,
  moderate: 5,
} as const;

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

// --- Helpers ---

const formatContextLength = (ctx?: number): string => {
  if (!ctx) return "—";
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)}M`;
  if (ctx >= 1_000) return `${Math.round(ctx / 1_000)}K`;
  return String(ctx);
};

const formatPrice = (priceStr?: string): string => {
  if (!priceStr) return "—";
  const perToken = parseFloat(priceStr);
  if (isNaN(perToken)) return "—";
  const perMillion = perToken * 1_000_000;
  if (perMillion < 0.01) return "Free";
  if (perMillion < 1) return `$${perMillion.toFixed(2)}`;
  return `$${perMillion.toFixed(2)}`;
};

const getContextColor = (ctx?: number): string => {
  if (!ctx) return "#888";
  if (ctx >= CONTEXT_THRESHOLDS.large) return "#4ade80"; // green — large
  if (ctx >= CONTEXT_THRESHOLDS.medium) return "#facc15"; // yellow — medium
  return "#f87171"; // red — small
};

const getPriceColor = (priceStr?: string): string => {
  if (!priceStr) return "#888";
  const perMillion = parseFloat(priceStr) * 1_000_000;
  if (isNaN(perMillion)) return "#888";
  if (perMillion < PRICE_THRESHOLDS.cheap) return "#4ade80"; // green — cheap
  if (perMillion < PRICE_THRESHOLDS.moderate) return "#facc15"; // yellow — moderate
  return "#f87171"; // red — expensive
};

const matchesSearch = (model: OpenRouterModel, query: string): boolean => {
  const lower = query.toLowerCase();
  return (
    model.name.toLowerCase().includes(lower) ||
    model.id.toLowerCase().includes(lower) ||
    (model.description?.toLowerCase().includes(lower) ?? false)
  );
};

// --- Data grouping (mirrors original ModelSelect logic) ---

interface ModelGroup {
  label: string;
  models: OpenRouterModel[];
}

const deduplicateModels = (models: OpenRouterModel[]): OpenRouterModel[] => {
  const seen = new Set<string>();
  return models.filter((m) => {
    if (!m.id || !m.name || seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
};

const buildGroups = (
  models: OpenRouterModel[],
  recentIds: string[],
): ModelGroup[] => {
  const unique = deduplicateModels(models);
  const byId = new Map(unique.map((m) => [m.id, m]));

  const recentModels = recentIds
    .map((id) => byId.get(id))
    .filter((m): m is OpenRouterModel => m !== undefined);

  const recentIdSet = new Set(recentIds);
  const recommendedModels = [...REDDIT_RECOMMENDED_IDS]
    .filter((id) => !recentIdSet.has(id))
    .map((id) => byId.get(id))
    .filter((m): m is OpenRouterModel => m !== undefined);

  const promotedIds = new Set([...recentIds, ...REDDIT_RECOMMENDED_IDS]);
  const allModels = unique
    .filter((m) => !promotedIds.has(m.id))
    .sort((a, b) => b.name.localeCompare(a.name));

  const groups: ModelGroup[] = [];
  if (recentModels.length > 0)
    groups.push({ label: "🕐 Recent", models: recentModels });
  if (recommendedModels.length > 0)
    groups.push({ label: "⭐ Reddit Recommended", models: recommendedModels });
  if (allModels.length > 0)
    groups.push({ label: "All Models", models: allModels });

  return groups;
};

// --- Sub-components ---

const ModelStatBadge: React.FC<{
  label: string;
  value: string;
  color: string;
}> = ({ label, value, color }) => (
  <span
    style={{
      fontSize: "11px",
      color,
      backgroundColor: `${color}18`,
      padding: "1px 6px",
      borderRadius: "3px",
      whiteSpace: "nowrap",
    }}
  >
    {label}: {value}
  </span>
);

const hasAdvancedControls = (model: OpenRouterModel): boolean =>
  supportsParameter(model, "reasoning") ||
  NUMBER_PARAMETERS.some(({ key }) => supportsParameter(model, key));

const AdvancedNumberInput: React.FC<{
  label: string;
  description: string;
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  onChange: (value: number | undefined) => void;
}> = ({
  label,
  description,
  value,
  min,
  max,
  step,
  placeholder,
  onChange,
}) => (
  <label
    style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) 96px",
      alignItems: "start",
      gap: "8px",
      fontSize: "12px",
      color: "#ddd",
    }}
  >
    <span>
      <span style={{ display: "block", fontWeight: 500 }}>{label}</span>
      <span
        style={{
          display: "block",
          color: "#92929d",
          fontSize: "11px",
          lineHeight: 1.35,
          marginTop: "2px",
        }}
      >
        {description}
      </span>
    </span>
    <input
      aria-label={label}
      type="number"
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const raw = e.currentTarget.value;
        onChange(raw === "" ? undefined : Number(raw));
      }}
      style={{
        width: "96px",
        padding: "4px 6px",
        backgroundColor: "rgba(0,0,0,0.28)",
        border: "1px solid rgba(255,255,255,0.16)",
        borderRadius: "4px",
        color: "#fff",
        fontSize: "12px",
        boxSizing: "border-box",
      }}
    />
  </label>
);

const AdvancedSettingsPanel: React.FC<{
  model: OpenRouterModel;
  settings: OpenRouterRequestSettings | undefined;
  onChange: (settings: OpenRouterRequestSettings | undefined) => void;
  onSavePreset: (name: string) => void;
}> = ({ model, settings, onChange, onSavePreset }) => {
  const [presetName, setPresetName] = useState("");

  const updateSetting = (
    key: keyof OpenRouterRequestSettings,
    value: OpenRouterRequestSettings[keyof OpenRouterRequestSettings],
  ) => {
    const next: OpenRouterRequestSettings = { ...(settings ?? {}) };
    if (value === undefined) {
      delete next[key];
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
    onChange(Object.keys(next).length > 0 ? next : undefined);
  };

  const supportedNumberParameters = NUMBER_PARAMETERS.filter(({ key }) =>
    supportsParameter(model, key),
  );

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        marginTop: "10px",
        padding: "10px",
        borderRadius: "6px",
        border: "1px solid rgba(147, 197, 253, 0.2)",
        backgroundColor: "rgba(8, 12, 20, 0.52)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#bfdbfe" }}>
          Advanced
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(undefined);
          }}
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "4px",
            color: "#ccc",
            cursor: "pointer",
            fontSize: "11px",
            padding: "2px 6px",
          }}
        >
          Reset
        </button>
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        {supportsParameter(model, "reasoning") && (
          <label
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 120px",
              alignItems: "start",
              gap: "8px",
              fontSize: "12px",
              color: "#ddd",
            }}
          >
            <span>
              <span style={{ display: "block", fontWeight: 500 }}>
                Reasoning
              </span>
              <span
                style={{
                  display: "block",
                  color: "#92929d",
                  fontSize: "11px",
                  lineHeight: 1.35,
                  marginTop: "2px",
                }}
              >
                Controls how much internal analysis the model uses. Medium is a
                balanced default; high or x-high may improve difficult work but
                costs more time and tokens.
              </span>
            </span>
            <select
              aria-label={`Reasoning level for ${model.name}`}
              value={settings?.reasoning?.effort ?? ""}
              onChange={(e) => {
                const effort = e.currentTarget.value as
                  | OpenRouterReasoningEffort
                  | "";
                updateSetting(
                  "reasoning",
                  effort ? { effort } : undefined,
                );
              }}
              style={{
                width: "120px",
                padding: "4px 6px",
                backgroundColor: "rgba(0,0,0,0.28)",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: "4px",
                color: "#fff",
                fontSize: "12px",
              }}
            >
              <option value="">Auto</option>
              {OPENROUTER_REASONING_EFFORTS.map((effort) => (
                <option key={effort} value={effort}>
                  {REASONING_LABELS[effort]}
                </option>
              ))}
            </select>
          </label>
        )}

        {supportedNumberParameters.map((parameter) => (
          <AdvancedNumberInput
            key={parameter.key}
            label={parameter.label}
            description={parameter.description}
            value={settings?.[parameter.key]}
            min={parameter.min}
            max={"max" in parameter ? parameter.max : undefined}
            step={parameter.step}
            placeholder={parameter.placeholder}
            onChange={(value) => updateSetting(parameter.key, value)}
          />
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!presetName.trim()) return;
          onSavePreset(presetName);
          setPresetName("");
        }}
        onClick={(event) => event.stopPropagation()}
        style={{
          display: "flex",
          gap: "6px",
          marginTop: "12px",
          paddingTop: "10px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <input
          aria-label={`Preset name for ${model.name}`}
          value={presetName}
          onChange={(event) => setPresetName(event.currentTarget.value)}
          placeholder="Preset name"
          style={{
            flex: 1,
            minWidth: 0,
            padding: "6px 8px",
            backgroundColor: "rgba(0,0,0,0.28)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: "4px",
            color: "#fff",
            fontSize: "12px",
          }}
        />
        <button
          type="submit"
          disabled={!presetName.trim()}
          style={{
            border: "1px solid rgba(147,197,253,0.3)",
            background: "rgba(147,197,253,0.14)",
            borderRadius: "4px",
            color: "#bfdbfe",
            cursor: presetName.trim() ? "pointer" : "default",
            fontSize: "11px",
            padding: "4px 9px",
            opacity: presetName.trim() ? 1 : 0.55,
          }}
        >
          Save preset
        </button>
      </form>
    </div>
  );
};

const ModelItem: React.FC<{
  model: OpenRouterModel;
  isSelected: boolean;
  allowAdvancedSettings: boolean;
  requestSettings?: OpenRouterRequestSettings;
  isAdvancedOpen: boolean;
  onAdvancedChange: (isOpen: boolean) => void;
  onRequestSettingsChange: (
    modelId: string,
    settings: OpenRouterRequestSettings | undefined,
  ) => void;
  onSavePreset: (model: OpenRouterModel, name: string) => void;
  onClick: () => void;
}> = ({
  model,
  isSelected,
  allowAdvancedSettings,
  requestSettings,
  isAdvancedOpen,
  onAdvancedChange,
  onRequestSettingsChange,
  onSavePreset,
  onClick,
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (
        e.target === e.currentTarget &&
        (e.key === "Enter" || e.key === " ")
      ) {
        e.preventDefault();
        onClick();
      }
    }}
    style={{
      display: "block",
      width: "100%",
      padding: "10px 14px",
      backgroundColor: isSelected ? "rgba(100, 100, 255, 0.15)" : "transparent",
      border: isSelected
        ? "1px solid rgba(100, 100, 255, 0.4)"
        : "1px solid transparent",
      borderRadius: "6px",
      boxSizing: "border-box",
      cursor: "pointer",
      textAlign: "left",
      color: "#fff",
      transition: "background-color 0.15s",
    }}
    onMouseEnter={(e) => {
      if (!isSelected)
        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
    }}
    onMouseLeave={(e) => {
      if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        minHeight: "24px",
        fontWeight: 500,
        fontSize: "14px",
        marginBottom: "2px",
      }}
    >
      <span style={{ minWidth: 0 }}>{model.name}</span>
      {allowAdvancedSettings && hasAdvancedControls(model) && (
        <button
          type="button"
          aria-label={`Advanced settings for ${model.name}`}
          aria-expanded={isAdvancedOpen}
          title={isAdvancedOpen ? "Collapse settings" : "Expand settings"}
          onClick={(event) => {
            event.stopPropagation();
            onAdvancedChange(!isAdvancedOpen);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 24px",
            width: "24px",
            height: "24px",
            padding: 0,
            border: "1px solid rgba(147, 197, 253, 0.25)",
            borderRadius: "4px",
            backgroundColor: isAdvancedOpen
              ? "rgba(147, 197, 253, 0.18)"
              : "rgba(255,255,255,0.05)",
            color: "#bfdbfe",
            cursor: "pointer",
            fontSize: "13px",
            lineHeight: 1,
            transform: isAdvancedOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.15s, background-color 0.15s",
          }}
        >
          ▼
        </button>
      )}
    </div>
    <div
      style={{
        fontSize: "11px",
        color: "#999",
        marginBottom: "6px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {model.id}
    </div>
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <ModelStatBadge
        label="Context"
        value={formatContextLength(model.context_length)}
        color={getContextColor(model.context_length)}
      />
      <ModelStatBadge
        label="Prompt"
        value={formatPrice(model.pricing?.prompt)}
        color={getPriceColor(model.pricing?.prompt)}
      />
      <ModelStatBadge
        label="Completion"
        value={formatPrice(model.pricing?.completion)}
        color={getPriceColor(model.pricing?.completion)}
      />
      {requestSettings?.reasoning?.effort && (
        <ModelStatBadge
          label="Reasoning"
          value={requestSettings.reasoning.effort}
          color="#93c5fd"
        />
      )}
      {hasOpenRouterRequestSettings(requestSettings) && (
        <ModelStatBadge label="Advanced" value="Set" color="#bfdbfe" />
      )}
    </div>
    {allowAdvancedSettings && isAdvancedOpen && (
      <AdvancedSettingsPanel
        model={model}
        settings={requestSettings}
        onChange={(settings) => onRequestSettingsChange(model.id, settings)}
        onSavePreset={(name) => onSavePreset(model, name)}
      />
    )}
  </div>
);

const GroupHeader: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      padding: "4px 8px",
      backgroundColor: "rgba(24, 24, 28, 0.98)",
    }}
  >
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        fontSize: "11px",
        fontWeight: 600,
        color: "#ccc",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderRadius: "999px",
        border: "1px solid rgba(255, 255, 255, 0.12)",
      }}
    >
      {label}
    </span>
  </div>
);

const SavedPresets: React.FC<{
  presets: ModelPreset[];
  models: OpenRouterModel[];
  onSelect: (preset: ModelPreset) => void;
  onDelete: (presetId: string) => void;
}> = ({ presets, models, onSelect, onDelete }) => {
  if (presets.length === 0) return null;

  const modelNames = new Map(models.map((model) => [model.id, model.name]));

  return (
    <div
      style={{
        padding: "0 20px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          color: "#aaa",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.5px",
          marginBottom: "7px",
          textTransform: "uppercase",
        }}
      >
        Saved presets
      </div>
      <div style={{ display: "flex", gap: "7px", overflowX: "auto" }}>
        {presets.map((preset) => (
          <div
            key={preset.id}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(90px, 1fr) auto",
              alignItems: "center",
              minWidth: "170px",
              background: "rgba(147,197,253,0.08)",
              border: "1px solid rgba(147,197,253,0.2)",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              aria-label={`Use preset ${preset.name}`}
              onClick={() => onSelect(preset)}
              style={{
                minWidth: 0,
                padding: "7px 4px 7px 10px",
                background: "transparent",
                border: 0,
                color: "#fff",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {preset.name}
              </span>
              <span
                style={{
                  display: "block",
                  color: "#92929d",
                  fontSize: "10px",
                  marginTop: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {modelNames.get(preset.modelId) ?? preset.modelId}
              </span>
            </button>
            <button
              type="button"
              aria-label={`Delete preset ${preset.name}`}
              onClick={() => onDelete(preset.id)}
              style={{
                color: "#92929d",
                fontSize: "13px",
                lineHeight: 1,
                padding: "9px 8px",
                background: "transparent",
                border: 0,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main Component ---

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

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedModelId,
  allowAdvancedSettings = true,
  selectedRequestSettings,
  onSelect,
}) => {
  const { models, isLoading } = useOpenRouterModels();
  const recentModelsService = useRef(d.RecentModelsService()).current;
  const modelPresetsService = useRef(d.ModelPresetsService()).current;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [advancedModelId, setAdvancedModelId] = useState<string | null>(null);
  const [presets, setPresets] = useState<ModelPreset[]>([]);
  const [requestSettingsByModel, setRequestSettingsByModel] = useState<
    Record<string, OpenRouterRequestSettings | undefined>
  >({});

  const recentIds = useMemo(
    () => recentModelsService.getRecentModels(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [models],
  );

  const groups = useMemo(
    () => buildGroups(models, recentIds),
    [models, recentIds],
  );

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;

    return groups
      .map((group) => ({
        ...group,
        models: group.models.filter((m) => matchesSearch(m, search)),
      }))
      .filter((group) => group.models.length > 0);
  }, [groups, search]);

  const totalResults = useMemo(
    () => filteredGroups.reduce((sum, g) => sum + g.models.length, 0),
    [filteredGroups],
  );

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setAdvancedModelId(selectedModelId ?? null);
      setRequestSettingsByModel(
        selectedModelId ? { [selectedModelId]: selectedRequestSettings } : {},
      );
      // Focus search input after modal opens
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [
    isOpen,
    modelPresetsService,
    selectedModelId,
    selectedRequestSettings,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    let isActive = true;
    const loadPresets = async () => {
      const storedPresets = await modelPresetsService.getPresets();
      if (isActive) setPresets(storedPresets);
    };
    const unsubscribe = modelPresetsService.subscribe(() => {
      void loadPresets();
    });

    void loadPresets();

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [isOpen, modelPresetsService]);

  const handleSelect = useCallback(
    (model: OpenRouterModel) => {
      const modelId = model.id;
      const requestSettings = filterSettingsForModel(
        requestSettingsByModel[modelId],
        model,
      );
      recentModelsService.trackModel(modelId);
      if (requestSettings) {
        onSelect(modelId, requestSettings);
      } else {
        onSelect(modelId);
      }
      onClose();
    },
    [recentModelsService, onSelect, onClose, requestSettingsByModel],
  );

  const handleRequestSettingsChange = useCallback(
    (modelId: string, settings: OpenRouterRequestSettings | undefined) => {
      setRequestSettingsByModel((current) => ({
        ...current,
        [modelId]: settings,
      }));
    },
    [],
  );

  const handleSavePreset = useCallback(
    async (model: OpenRouterModel, name: string) => {
      await modelPresetsService.savePreset({
        name,
        modelId: model.id,
        requestSettings: filterSettingsForModel(
          requestSettingsByModel[model.id],
          model,
        ),
      });
      setPresets(await modelPresetsService.getPresets());
    },
    [modelPresetsService, requestSettingsByModel],
  );

  const handlePresetSelect = useCallback(
    (preset: ModelPreset) => {
      recentModelsService.trackModel(preset.modelId);
      onSelect(preset.modelId, preset.requestSettings);
      onClose();
    },
    [onClose, onSelect, recentModelsService],
  );

  const handlePresetDelete = useCallback(
    async (presetId: string) => {
      await modelPresetsService.deletePreset(presetId);
      setPresets(await modelPresetsService.getPresets());
    },
    [modelPresetsService],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.75)",
      }}
    >
      <div
        style={{
          width: "min(560px, 90vw)",
          height: "80vh",
          backgroundColor: "rgba(24, 24, 28, 0.98)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ color: "#fff", fontSize: "16px", fontWeight: 600 }}>
            Select Model
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              fontSize: "20px",
              cursor: "pointer",
              padding: "4px 8px",
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 20px" }}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search models by name, ID, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(100, 100, 255, 0.4)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            }}
          />
          <div
            style={{
              fontSize: "11px",
              color: "#888",
              marginTop: "6px",
              paddingLeft: "2px",
            }}
          >
            {isLoading
              ? "Loading models..."
              : `${totalResults} model${totalResults !== 1 ? "s" : ""} available`}
          </div>
        </div>

        <SavedPresets
          presets={presets}
          models={models}
          onSelect={handlePresetSelect}
          onDelete={handlePresetDelete}
        />

        {/* Model List */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            padding: "0 12px 12px",
            overflow: "hidden",
          }}
        >
          {filteredGroups.length === 0 && !isLoading ? (
            <div
              style={{
                textAlign: "center",
                color: "#888",
                padding: "32px 0",
                fontSize: "14px",
              }}
            >
              No models found matching &quot;{search}&quot;
            </div>
          ) : (
            <GroupedVirtuoso
              style={{ height: "100%" }}
              groupCounts={filteredGroups.map((g) => g.models.length)}
              groupContent={(index) => (
                <GroupHeader label={filteredGroups[index].label} />
              )}
              itemContent={(index) => {
                let offset = 0;
                for (const group of filteredGroups) {
                  if (index < offset + group.models.length) {
                    const model = group.models[index - offset];
                    return (
                      <ModelItem
                        model={model}
                        isSelected={model.id === selectedModelId}
                        allowAdvancedSettings={allowAdvancedSettings}
                        requestSettings={filterSettingsForModel(
                          requestSettingsByModel[model.id],
                          model,
                        )}
                        isAdvancedOpen={advancedModelId === model.id}
                        onAdvancedChange={(isOpen) =>
                          setAdvancedModelId(isOpen ? model.id : null)
                        }
                        onRequestSettingsChange={handleRequestSettingsChange}
                        onSavePreset={handleSavePreset}
                        onClick={() => handleSelect(model)}
                      />
                    );
                  }
                  offset += group.models.length;
                }
                return null;
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
