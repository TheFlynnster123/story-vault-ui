import React, { useState, useEffect } from "react";
import { useSystemSettings } from "../hooks/useSystemSettings";
import { Group, Loader, NumberInput, Paper, Stack, Switch, Text } from "@mantine/core";
import type { ChatGenerationSettings } from "../services/SystemSettings";
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
  const [hideMessageBodiesByDefault, setHideMessageBodiesByDefault] =
    useState(false);

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
    setHideMessageBodiesByDefault(
      systemSettings?.openRouterMonitoringSettings?.hideMessageBodiesByDefault ??
        false,
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
    hideMessageBodiesByDefault?: boolean;
  }) => {
    const updatedMonitoringSettings = {
      ...systemSettings?.openRouterMonitoringSettings,
      ...settings,
    };

    if (settings.trackedRequestLimit !== undefined) {
      setTrackedRequestLimit(settings.trackedRequestLimit);
      d.RequestTracker().setRequestLimit(settings.trackedRequestLimit);
    }
    if (settings.hideMessageBodiesByDefault !== undefined) {
      setHideMessageBodiesByDefault(settings.hideMessageBodiesByDefault);
    }

    d.SystemSettingsService().SaveDebounced({
      ...systemSettings,
      openRouterMonitoringSettings: updatedMonitoringSettings,
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
            max_tokens: requestSettings?.max_tokens,
            frequency_penalty: requestSettings?.frequency_penalty,
            presence_penalty: requestSettings?.presence_penalty,
            repetition_penalty: requestSettings?.repetition_penalty,
            seed: requestSettings?.seed,
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
            <Switch
              label="Hide request and response bodies by default"
              checked={hideMessageBodiesByDefault}
              onChange={(event) =>
                handleMonitoringChange({
                  hideMessageBodiesByDefault: event.currentTarget.checked,
                })
              }
            />
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
};
