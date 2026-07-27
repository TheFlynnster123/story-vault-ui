import React, { useState, useEffect } from "react";
import { useSystemSettings } from "../hooks/useSystemSettings";
import {
  Group,
  Loader,
  NumberInput,
  Paper,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import type { ChatGenerationSettings } from "../services/SystemSettings";
import {
  DEFAULT_MESSAGE_COMPRESSION_AFTER_MESSAGES,
  DEFAULT_MESSAGE_COMPRESSION_MINIMUM_CHARACTERS,
  DEFAULT_TRAILING_CHAPTER_MESSAGES,
  normalizeMessageCompressionAfterMessages,
  normalizeMessageCompressionMinimumCharacters,
} from "../services/SystemSettings";
import { d } from "../../../services/Dependencies";
import { ModelSelect } from "../../../features/AI/components/ModelSelect";
import {
  MAX_TRACKED_REQUEST_LIMIT,
  MIN_TRACKED_REQUEST_LIMIT,
  normalizeTrackedRequestLimit,
} from "../../OpenRouter/services/RequestTracker";

export const SystemSettingsEditor: React.FC = () => {
  const { systemSettings, isLoading } = useSystemSettings();
  const [localSettings, setLocalSettings] = useState<ChatGenerationSettings>(
    {},
  );
  const [trackedRequestLimit, setTrackedRequestLimit] = useState(20);
  const [trailingChapterMessages, setTrailingChapterMessages] = useState(
    DEFAULT_TRAILING_CHAPTER_MESSAGES,
  );
  const [messageCompressionEnabled, setMessageCompressionEnabled] =
    useState(false);
  const [messageCompressionAfterMessages, setMessageCompressionAfterMessages] =
    useState(DEFAULT_MESSAGE_COMPRESSION_AFTER_MESSAGES);
  const [
    messageCompressionMinimumCharacters,
    setMessageCompressionMinimumCharacters,
  ] = useState(DEFAULT_MESSAGE_COMPRESSION_MINIMUM_CHARACTERS);

  useEffect(() => {
    if (systemSettings?.chatGenerationSettings) {
      setLocalSettings({
        ...systemSettings.chatGenerationSettings,
      });
    }
    setTrackedRequestLimit(
      normalizeTrackedRequestLimit(
        systemSettings?.openRouterMonitoringSettings?.trackedRequestLimit,
      ),
    );
    setTrailingChapterMessages(
      systemSettings?.chapterCompressionSettings?.trailingChapterMessages ??
        DEFAULT_TRAILING_CHAPTER_MESSAGES,
    );
    setMessageCompressionEnabled(
      systemSettings?.messageCompressionSettings?.enabled ?? false,
    );
    setMessageCompressionAfterMessages(
      normalizeMessageCompressionAfterMessages(
        systemSettings?.messageCompressionSettings?.afterMessages,
      ),
    );
    setMessageCompressionMinimumCharacters(
      normalizeMessageCompressionMinimumCharacters(
        systemSettings?.messageCompressionSettings?.minimumCharacters,
      ),
    );
  }, [systemSettings]);

  const handleSettingChange = (
    newSettings: Partial<ChatGenerationSettings>,
  ) => {
    setLocalSettings((currentSettings) => {
      const updatedSettings = { ...currentSettings, ...newSettings };

      d.SystemSettingsService().SaveDebounced({
        ...systemSettings,
        chatGenerationSettings: updatedSettings,
      });

      return updatedSettings;
    });
  };

  const handleMonitoringChange = (settings: {
    trackedRequestLimit?: number;
  }) => {
    const updatedMonitoringSettings = {
      ...systemSettings?.openRouterMonitoringSettings,
      ...settings,
    };

    if (settings.trackedRequestLimit !== undefined) {
      setTrackedRequestLimit(settings.trackedRequestLimit);
      d.RequestTracker().setRequestLimit(settings.trackedRequestLimit);
    }
    d.SystemSettingsService().SaveDebounced({
      ...systemSettings,
      openRouterMonitoringSettings: updatedMonitoringSettings,
    });
  };

  const handleChapterCompressionChange = (value: number | string) => {
    const numeric = typeof value === "number" ? value : Number(value);
    const nextValue = Number.isFinite(numeric)
      ? Math.max(0, Math.round(numeric))
      : DEFAULT_TRAILING_CHAPTER_MESSAGES;

    setTrailingChapterMessages(nextValue);
    d.SystemSettingsService().SaveDebounced({
      ...systemSettings,
      chapterCompressionSettings: {
        ...systemSettings?.chapterCompressionSettings,
        trailingChapterMessages: nextValue,
      },
    });
  };

  const handleMessageCompressionChange = (
    settings: Partial<{
      enabled: boolean;
      afterMessages: number;
      minimumCharacters: number;
    }>,
  ) => {
    if (settings.enabled !== undefined) {
      setMessageCompressionEnabled(settings.enabled);
    }
    if (settings.afterMessages !== undefined) {
      setMessageCompressionAfterMessages(settings.afterMessages);
    }
    if (settings.minimumCharacters !== undefined) {
      setMessageCompressionMinimumCharacters(settings.minimumCharacters);
    }

    d.SystemSettingsService().SaveDebounced({
      ...systemSettings,
      messageCompressionSettings: {
        ...systemSettings?.messageCompressionSettings,
        ...settings,
      },
    });
  };

  if (isLoading) {
    return (
      <Group>
        <Loader size="sm" />
        <Text>Loading settings...</Text>
      </Group>
    );
  }

  return (
    <Stack gap="md">
      <ModelSelect
        value={localSettings.model || ""}
        onChange={(value) => handleSettingChange({ model: value || undefined })}
        requestSettings={localSettings}
        onRequestSettingsChange={(requestSettings) =>
          handleSettingChange({
            reasoning: requestSettings?.reasoning,
            temperature: requestSettings?.temperature,
            top_p: requestSettings?.top_p,
            top_k: requestSettings?.top_k,
            max_tokens: requestSettings?.max_tokens,
            frequency_penalty: requestSettings?.frequency_penalty,
            presence_penalty: requestSettings?.presence_penalty,
            repetition_penalty: requestSettings?.repetition_penalty,
            seed: requestSettings?.seed,
            retry: requestSettings?.retry,
          })
        }
        withDescription
      />
      <Paper p="md" withBorder>
        <Stack gap="sm">
          <Text fw={600}>OpenRouter Monitoring</Text>
          <Group align="end">
            <NumberInput
              label="Requests to keep in memory"
              value={trackedRequestLimit}
              min={MIN_TRACKED_REQUEST_LIMIT}
              max={MAX_TRACKED_REQUEST_LIMIT}
              clampBehavior="strict"
              onChange={(value) =>
                handleMonitoringChange({
                  trackedRequestLimit: normalizeTrackedRequestLimit(
                    Number(value),
                  ),
                })
              }
              style={{ width: 240 }}
            />
          </Group>
        </Stack>
      </Paper>

      <Paper p="md" withBorder>
        <Stack gap="sm">
          <Text fw={600}>Chapter Compression</Text>
          <NumberInput
            label="Trailing chapter messages in LLM context"
            description="Covered messages from the latest chapter to keep in context until this many new visible messages have been added after the chapter. Use 0 to disable the trailing buffer."
            value={trailingChapterMessages}
            min={0}
            max={100}
            step={1}
            onChange={handleChapterCompressionChange}
            style={{ width: "100%", maxWidth: 360 }}
          />
        </Stack>
      </Paper>

      <Paper p="md" withBorder>
        <Stack gap="sm">
          <Text fw={600}>Message Compression</Text>
          <Switch
            label="Automatically compress older text messages"
            description="The full transcript remains visible. Turning this off hides saved compressions and sends original messages to every LLM context; turning it back on restores them."
            checked={messageCompressionEnabled}
            onChange={(event) =>
              handleMessageCompressionChange({
                enabled: event.currentTarget.checked,
              })
            }
          />
          <Group grow align="start" wrap="wrap">
            <NumberInput
              label="Newer messages before compression"
              description="Reasoning, images, chapters, plans, and notes do not count."
              value={messageCompressionAfterMessages}
              min={0}
              max={100}
              step={1}
              disabled={!messageCompressionEnabled}
              onChange={(value) =>
                handleMessageCompressionChange({
                  afterMessages: normalizeMessageCompressionAfterMessages(
                    Number(value),
                  ),
                })
              }
              style={{ minWidth: 220 }}
            />
            <NumberInput
              label="Minimum original characters"
              description="Shorter messages remain uncompressed."
              value={messageCompressionMinimumCharacters}
              min={0}
              max={100000}
              step={50}
              disabled={!messageCompressionEnabled}
              onChange={(value) =>
                handleMessageCompressionChange({
                  minimumCharacters:
                    normalizeMessageCompressionMinimumCharacters(
                      Number(value),
                    ),
                })
              }
              style={{ minWidth: 220 }}
            />
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
};
