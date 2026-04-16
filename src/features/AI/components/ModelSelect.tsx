import React, { useCallback, useMemo, useRef, useState } from "react";
import { Loader, Stack, Text } from "@mantine/core";
import { useOpenRouterModels } from "../../OpenRouter/hooks/useOpenRouterModels";
import type { OpenRouterModel } from "../../OpenRouter/services/OpenRouterModelsAPI";
import { d } from "../../../services/Dependencies";
import { ModelSelectorModal } from "./ModelSelectorModal";

const findModelName = (
  models: OpenRouterModel[],
  modelId: string | null,
): string | undefined =>
  modelId ? models.find((m) => m.id === modelId)?.name : undefined;

interface ModelSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  withDescription?: boolean;
}

export const ModelSelect: React.FC<ModelSelectProps> = ({
  value,
  onChange,
  label = "Model",
  withDescription = true,
}) => {
  const { models, isLoading } = useOpenRouterModels();
  const recentModelsService = useRef(d.RecentModelsService()).current;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const displayName = useMemo(
    () => findModelName(models, value) ?? (value || "Default"),
    [models, value],
  );

  const handleSelect = useCallback(
    (modelId: string) => {
      recentModelsService.trackModel(modelId);
      onChange(modelId);
    },
    [recentModelsService, onChange],
  );

  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  return (
    <Stack gap="xs">
      <div>
        {label && (
          <Text
            component="label"
            size="sm"
            fw={500}
            style={{ display: "block", marginBottom: 4 }}
          >
            {label}
          </Text>
        )}
        <button
          type="button"
          aria-label={label}
          onClick={() => setIsModalOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "8px 12px",
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "6px",
            color: value ? "#fff" : "#888",
            fontSize: "14px",
            cursor: "pointer",
            textAlign: "left",
            minHeight: "36px",
            transition: "border-color 0.15s",
            boxSizing: "border-box",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(100, 100, 255, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {displayName}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {isLoading && <Loader size="xs" />}
            {value && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear model selection"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    handleClear();
                  }
                }}
                style={{
                  color: "#888",
                  fontSize: "16px",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "0 2px",
                }}
              >
                ✕
              </span>
            )}
            <span style={{ color: "#666", fontSize: "12px" }}>▼</span>
          </span>
        </button>
      </div>
      {withDescription && (
        <Text size="sm" c="dimmed">
          Select which model to use for chat generation via OpenRouter.
          Different models offer varying levels of speed and reasoning
          capabilities. Leave empty to use the default model.
        </Text>
      )}
      <ModelSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedModelId={value || undefined}
        onSelect={handleSelect}
      />
    </Stack>
  );
};
