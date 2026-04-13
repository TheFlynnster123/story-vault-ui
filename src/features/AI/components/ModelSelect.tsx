import React, { useCallback, useMemo, useRef } from "react";
import { Loader, Select, Stack, Text } from "@mantine/core";
import { useOpenRouterModels } from "../../OpenRouter/hooks/useOpenRouterModels";
import type { OpenRouterModel } from "../../OpenRouter/services/OpenRouterModelsAPI";
import { d } from "../../../services/Dependencies";

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

interface SelectItem {
  value: string;
  label: string;
}

interface SelectGroup {
  group: string;
  items: SelectItem[];
}

type SelectData = (SelectItem | SelectGroup)[];

const toSelectItem = (model: OpenRouterModel): SelectItem => ({
  value: model.id,
  label: model.name,
});

const buildRecentGroup = (
  recentIds: string[],
  modelsById: Map<string, OpenRouterModel>,
): SelectGroup | null => {
  const items = recentIds
    .map((id) => modelsById.get(id))
    .filter((m): m is OpenRouterModel => m !== undefined)
    .map(toSelectItem);

  return items.length > 0 ? { group: "🕐 Recent", items } : null;
};

const buildRecommendedGroup = (
  modelsById: Map<string, OpenRouterModel>,
  excludeIds: Set<string>,
): SelectGroup | null => {
  const items = [...REDDIT_RECOMMENDED_IDS]
    .filter((id) => !excludeIds.has(id))
    .map((id) => modelsById.get(id))
    .filter((m): m is OpenRouterModel => m !== undefined)
    .map(toSelectItem);

  return items.length > 0
    ? { group: "⭐ Reddit Recommended", items }
    : null;
};

const buildAllModelsGroup = (
  models: OpenRouterModel[],
  excludeIds: Set<string>,
): SelectGroup => {
  const items = models
    .filter((m) => !excludeIds.has(m.id))
    .map(toSelectItem)
    .sort((a, b) => a.label.localeCompare(b.label));

  return { group: "All Models", items };
};

const deduplicateModels = (models: OpenRouterModel[]): OpenRouterModel[] => {
  const seen = new Set<string>();
  return models.filter((m) => {
    if (!m.id || !m.name || seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
};

const buildSelectData = (
  models: OpenRouterModel[],
  recentIds: string[],
): SelectData => {
  const uniqueModels = deduplicateModels(models);
  const modelsById = new Map(uniqueModels.map((m) => [m.id, m]));

  const recentGroup = buildRecentGroup(recentIds, modelsById);
  const recentIdSet = new Set(recentIds);
  const recommendedGroup = buildRecommendedGroup(modelsById, recentIdSet);

  const promotedIds = new Set([
    ...recentIds,
    ...REDDIT_RECOMMENDED_IDS,
  ]);
  const allModelsGroup = buildAllModelsGroup(uniqueModels, promotedIds);

  const groups: SelectData = [{ value: "", label: "Default" }];
  if (recentGroup) groups.push(recentGroup);
  if (recommendedGroup) groups.push(recommendedGroup);
  if (allModelsGroup.items.length > 0) groups.push(allModelsGroup);

  return groups;
};

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

  const recentIds = useMemo(
    () => recentModelsService.getRecentModels(),
    // Re-read recent models when the fetched model list changes (i.e., once on load)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [models],
  );

  const selectData = useMemo(
    () => buildSelectData(models, recentIds),
    [models, recentIds],
  );

  const handleChange = useCallback(
    (newValue: string | null) => {
      if (newValue) {
        recentModelsService.trackModel(newValue);
      }
      onChange(newValue);
    },
    [recentModelsService, onChange],
  );

  return (
    <Stack gap="xs">
      <Select
        label={label}
        value={value}
        onChange={handleChange}
        data={selectData}
        searchable
        clearable
        nothingFoundMessage="No models found"
        rightSection={isLoading ? <Loader size="xs" /> : undefined}
        limit={200}
      />
      {withDescription && (
        <Text size="sm" c="dimmed">
          Select which model to use for chat generation via OpenRouter.
          Different models offer varying levels of speed and reasoning
          capabilities. Leave empty to use the default model.
        </Text>
      )}
    </Stack>
  );
};
