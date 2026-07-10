import React, { useEffect, useState } from "react";
import { Box, Group, NumberInput, Stack, Switch, Text, Button } from "@mantine/core";
import { FaUser } from "react-icons/fa";
import { Theme } from "../../../components/Theme";
import type { CharacterDescription } from "../services/CharacterDescription";
import { useCharacterDescriptions } from "../hooks/useCharacterDescriptions";
import { FlowButton } from "../../Chat/components/Chat/Flow/FlowButton";
import { ContentPreview } from "../../Chat/components/Chat/Flow/ContentPreview";
import { PreviewItem } from "../../Chat/components/Chat/Flow/PreviewItem";
import { d } from "../../../services/Dependencies";
import {
  DEFAULT_CHARACTER_SHEET_CHECK_INTERVAL,
  DEFAULT_CHARACTER_SHEET_TRAILING_MESSAGE_COUNT,
} from "../services/CharacterSheetGenerationService";

interface CharacterDescriptionsSectionProps {
  chatId: string;
  onNavigate: () => void;
}

export const CharacterDescriptionsSection: React.FC<
  CharacterDescriptionsSectionProps
> = ({ chatId, onNavigate }) => {
  const { characters } = useCharacterDescriptions(chatId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(true);
  const [checkInterval, setCheckInterval] = useState(
    DEFAULT_CHARACTER_SHEET_CHECK_INTERVAL,
  );
  const [trailingMessageCount, setTrailingMessageCount] = useState(
    DEFAULT_CHARACTER_SHEET_TRAILING_MESSAGE_COUNT,
  );
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const settingsService = d.ChatSettingsService(chatId);
    const load = async () => {
      const settings = await settingsService.Get();
      setAutoGenerateEnabled(settings?.characterSheetsAutoGenerateEnabled ?? true);
      setCheckInterval(
        normalizeNumber(
          settings?.characterSheetsCheckInterval,
          DEFAULT_CHARACTER_SHEET_CHECK_INTERVAL,
          1,
          100,
        ),
      );
      setTrailingMessageCount(
        normalizeNumber(
          settings?.characterSheetsTrailingMessageCount,
          DEFAULT_CHARACTER_SHEET_TRAILING_MESSAGE_COUNT,
          0,
          50,
        ),
      );
    };
    void load();
    return settingsService.subscribe(() => void load());
  }, [chatId]);

  const updateSettings = (updates: Record<string, number | boolean>) => {
    void d.ChatSettingsService(chatId).update(updates);
  };

  const checkNow = async () => {
    setStatus(null);
    setIsChecking(true);
    try {
      const count = await d
        .CharacterSheetGenerationService(chatId)
        .generateNow();
      setStatus(count ? `Generated ${count} character sheet${count === 1 ? "" : "s"}.` : "No new primary characters found.");
    } catch (error) {
      d.ErrorService().log("Failed to check character sheets", error);
      setStatus("Could not check character sheets.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Box>
      <FlowButton
        onClick={onNavigate}
        leftSection={<FaUser size={16} color={Theme.character.primary} />}
      >
        <Group gap="xs">
          <Text size="sm" fw={500}>
            Characters
          </Text>
          <Text size="xs" c="dimmed">
            ({characters.length})
          </Text>
        </Group>
      </FlowButton>

      <ContentPreview
        items={characters}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        renderItem={(character) =>
          renderCharacterPreview(character, isExpanded)
        }
        emptyMessage="No characters saved"
      />

      <Stack gap="xs" mt="xs" px="xs">
        <Switch
          size="xs"
          checked={autoGenerateEnabled}
          onChange={(event) => {
            const enabled = event.currentTarget.checked;
            setAutoGenerateEnabled(enabled);
            updateSettings({
              characterSheetsAutoGenerateEnabled: enabled,
              characterSheetsMessagesSinceLastCheck: 0,
            });
          }}
          label="Automatically create sheets for new primary characters"
        />
        <NumberInput
          size="xs"
          label="Check every N user messages"
          value={checkInterval}
          min={1}
          max={100}
          disabled={!autoGenerateEnabled}
          onChange={(value) => {
            const next = normalizeNumber(
              value,
              DEFAULT_CHARACTER_SHEET_CHECK_INTERVAL,
              1,
              100,
            );
            setCheckInterval(next);
            updateSettings({
              characterSheetsCheckInterval: next,
              characterSheetsMessagesSinceLastCheck: 0,
            });
          }}
        />
        <NumberInput
          size="xs"
          label="Keep N recent messages after character context"
          description="Character Sheets and Memories float before these messages."
          value={trailingMessageCount}
          min={0}
          max={50}
          onChange={(value) => {
            const next = normalizeNumber(
              value,
              DEFAULT_CHARACTER_SHEET_TRAILING_MESSAGE_COUNT,
              0,
              50,
            );
            setTrailingMessageCount(next);
            updateSettings({ characterSheetsTrailingMessageCount: next });
          }}
        />
        <Group gap="xs">
          <Button size="xs" variant="light" loading={isChecking} onClick={checkNow}>
            Check now
          </Button>
          <Button size="xs" variant="subtle" onClick={onNavigate}>
            Edit character sheets
          </Button>
        </Group>
        {status && <Text size="xs" c="dimmed">{status}</Text>}
      </Stack>
    </Box>
  );
};

const renderCharacterPreview = (
  character: CharacterDescription,
  isExpanded: boolean,
) => (
  <PreviewItem
    key={character.id}
    name={character.name || "Unnamed character"}
    content={toPreviewContent(character)}
    isExpanded={isExpanded}
  />
);

const toPreviewContent = (character: CharacterDescription): string => {
  if (character.sheet?.trim()) {
    return character.sheet;
  }

  if (character.appearance.trim()) return character.appearance;

  return "No character sheet or appearance was generated.";
};

const normalizeNumber = (
  value: number | string | undefined,
  fallback: number,
  min: number,
  max: number,
): number => {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
};
