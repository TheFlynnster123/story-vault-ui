import { useEffect, useState } from "react";
import { Group, NumberInput, Paper, Stack, Switch, Text } from "@mantine/core";
import { d } from "../../../services/Dependencies";
import { EditPromptButton } from "../../AI/components/EditPromptButton";
import { GenerateButton } from "../../AI/components/GenerateButton";
import {
  DEFAULT_CHARACTER_SHEET_SYNC_INTERVAL,
  DEFAULT_CHARACTER_SHEET_TRAILING_MESSAGE_COUNT,
  getCharacterSheetSettings,
  MAX_SYNC_INTERVAL,
  MAX_TRAILING_MESSAGE_COUNT,
  MIN_SYNC_INTERVAL,
  MIN_TRAILING_MESSAGE_COUNT,
  normalizeCharacterSheetSyncInterval,
  normalizeCharacterSheetTrailingMessageCount,
} from "../services/CharacterSheetSettings";
import type { CharacterMaintenanceResult } from "../services/CharacterMaintenanceService";

interface CharacterSettingsPanelProps {
  chatId: string;
  hasPendingProposal: boolean;
  onEditActivePrompt: () => void;
  onEditSheetPrompt: () => void;
}

export const CharacterSettingsPanel: React.FC<CharacterSettingsPanelProps> = ({
  chatId,
  hasPendingProposal,
  onEditActivePrompt,
  onEditSheetPrompt,
}) => {
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(
    DEFAULT_CHARACTER_SHEET_SYNC_INTERVAL,
  );
  const [trailingMessageCount, setTrailingMessageCount] = useState(
    DEFAULT_CHARACTER_SHEET_TRAILING_MESSAGE_COUNT,
  );
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const [status, setStatus] = useState<string>();

  useEffect(() => {
    const settingsService = d.ChatSettingsService(chatId);
    const load = async () => {
      const settings = getCharacterSheetSettings(await settingsService.Get());
      setAutoSyncEnabled(settings.autoSyncEnabled);
      setSyncInterval(settings.syncInterval);
      setTrailingMessageCount(settings.trailingMessageCount);
    };

    void load();
    return settingsService.subscribe(() => void load());
  }, [chatId]);

  const updateSettings = (
    updates: Parameters<ReturnType<typeof d.ChatSettingsService>["update"]>[0],
  ) => {
    void d.ChatSettingsService(chatId).update(updates);
  };

  const synchronizeNow = async () => {
    setStatus(undefined);
    setIsSynchronizing(true);
    try {
      const result = await d
        .CharacterMaintenanceService(chatId)
        .synchronizeNow();
      setStatus(toStatusMessage(result));
    } catch (error) {
      d.ErrorService().log("Failed to prepare character updates", error);
      setStatus("Character updates could not be prepared.");
    } finally {
      setIsSynchronizing(false);
    }
  };

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <div>
          <Text fw={600}>Character synchronization</Text>
          <Text size="sm" c="dimmed">
            Story context can prepare active-cast and Character Sheet changes.
            Per-character auto-accepted changes apply immediately; other
            changes remain pending in the chat&apos;s character update control.
          </Text>
        </div>

        <Switch
          checked={autoSyncEnabled}
          label="Automatically prepare updates for active Character Sheets"
          onChange={(event) => {
            const enabled = event.currentTarget.checked;
            setAutoSyncEnabled(enabled);
            updateSettings({
              characterSheetsAutoSyncEnabled: enabled,
              characterSheetsMessagesSinceLastSync: 0,
            });
          }}
        />

        <NumberInput
          label="Prepare updates every N saved user turns"
          value={syncInterval}
          min={MIN_SYNC_INTERVAL}
          max={MAX_SYNC_INTERVAL}
          disabled={!autoSyncEnabled}
          onChange={(value) => {
            const interval = normalizeCharacterSheetSyncInterval(value);
            setSyncInterval(interval);
            updateSettings({
              characterSheetsSyncInterval: interval,
              characterSheetsMessagesSinceLastSync: 0,
            });
          }}
        />

        <NumberInput
          label="Keep N recent messages after character context"
          description="Memories and approved active Character Sheets appear before these recent messages."
          value={trailingMessageCount}
          min={MIN_TRAILING_MESSAGE_COUNT}
          max={MAX_TRAILING_MESSAGE_COUNT}
          onChange={(value) => {
            const count = normalizeCharacterSheetTrailingMessageCount(value);
            setTrailingMessageCount(count);
            updateSettings({ characterSheetsTrailingMessageCount: count });
          }}
        />

        <Group>
          <GenerateButton
            size="xs"
            loading={isSynchronizing}
            disabled={hasPendingProposal || isSynchronizing}
            onClick={synchronizeNow}
          >
            Prepare updates now
          </GenerateButton>
          <EditPromptButton onClick={onEditActivePrompt}>
            Edit active cast prompt
          </EditPromptButton>
          <EditPromptButton onClick={onEditSheetPrompt}>
            Edit sheet update prompt
          </EditPromptButton>
        </Group>

        {hasPendingProposal && (
          <Text size="xs" c="dimmed">
            A character update proposal is waiting in the chat controls.
          </Text>
        )}
        {status && (
          <Text size="xs" c="dimmed">
            {status}
          </Text>
        )}
      </Stack>
    </Paper>
  );
};

const toStatusMessage = (result: CharacterMaintenanceResult): string => {
  if (result.status === "proposal-created") {
    const pending = `${result.proposedChangeCount} character update${
      result.proposedChangeCount === 1 ? "" : "s"
    } ready for review.`;
    if (result.autoAppliedChangeCount === 0) return pending;
    return `${result.autoAppliedChangeCount} applied automatically; ${pending}`;
  }
  if (result.status === "auto-applied") {
    return `${result.autoAppliedChangeCount} character update${
      result.autoAppliedChangeCount === 1 ? "" : "s"
    } applied automatically.`;
  }
  if (result.status === "unchanged") {
    return "No character changes were proposed.";
  }
  if (result.reason === "pending-approval") {
    return "Review or discard the pending character proposal first.";
  }
  if (result.status === "failed") {
    return "Character updates could not be prepared.";
  }
  return "Character synchronization was skipped.";
};
