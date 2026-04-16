import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useOpenRouterModels } from "../../OpenRouter/hooks/useOpenRouterModels";
import { d } from "../../../services/Dependencies";
import type { OpenRouterModel } from "../../OpenRouter/services/OpenRouterModelsAPI";

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
  if (recentModels.length > 0) groups.push({ label: "🕐 Recent", models: recentModels });
  if (recommendedModels.length > 0) groups.push({ label: "⭐ Reddit Recommended", models: recommendedModels });
  if (allModels.length > 0) groups.push({ label: "All Models", models: allModels });

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

const ModelItem: React.FC<{
  model: OpenRouterModel;
  isSelected: boolean;
  onClick: () => void;
}> = ({ model, isSelected, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: "block",
      width: "100%",
      padding: "10px 14px",
      backgroundColor: isSelected ? "rgba(100, 100, 255, 0.15)" : "transparent",
      border: isSelected ? "1px solid rgba(100, 100, 255, 0.4)" : "1px solid transparent",
      borderRadius: "6px",
      cursor: "pointer",
      textAlign: "left",
      color: "#fff",
      transition: "background-color 0.15s",
    }}
    onMouseEnter={(e) => {
      if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
    }}
    onMouseLeave={(e) => {
      if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
    }}
  >
    <div style={{ fontWeight: 500, fontSize: "14px", marginBottom: "2px" }}>
      {model.name}
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
    </div>
  </button>
);

const GroupHeader: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      padding: "8px 14px 4px",
      fontSize: "12px",
      fontWeight: 600,
      color: "#aaa",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    }}
  >
    {label}
  </div>
);

// --- Main Component ---

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModelId: string | undefined;
  onSelect: (modelId: string) => void;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedModelId,
  onSelect,
}) => {
  const { models, isLoading } = useOpenRouterModels();
  const recentModelsService = useRef(d.RecentModelsService()).current;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  const recentIds = useMemo(
    () => recentModelsService.getRecentModels(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [models],
  );

  const groups = useMemo(() => buildGroups(models, recentIds), [models, recentIds]);

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
      // Focus search input after modal opens
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (modelId: string) => {
      recentModelsService.trackModel(modelId);
      onSelect(modelId);
      onClose();
    },
    [recentModelsService, onSelect, onClose],
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
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          width: "min(560px, 90vw)",
          maxHeight: "80vh",
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

        {/* Model List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 12px 12px",
          }}
        >
          {filteredGroups.length === 0 && !isLoading && (
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
          )}
          {filteredGroups.map((group) => (
            <div key={group.label} style={{ marginBottom: "8px" }}>
              <GroupHeader label={group.label} />
              {group.models.map((model) => (
                <ModelItem
                  key={model.id}
                  model={model}
                  isSelected={model.id === selectedModelId}
                  onClick={() => handleSelect(model.id)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
