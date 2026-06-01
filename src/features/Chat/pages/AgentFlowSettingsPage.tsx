import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ActionIcon,
  Divider,
  Group,
  NumberInput,
  Paper,
  Slider,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { RiArrowLeftLine, RiSparkling2Line } from "react-icons/ri";
import { Page } from "../../../components/Page";
import { Theme } from "../../../components/Theme";
import { d } from "../../../services/Dependencies";

const DEFAULT_INTERVAL = 3;
const DEFAULT_SENSITIVITY = 50;

export const AgentFlowSettingsPage: React.FC = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [autoRunEnabled, setAutoRunEnabled] = useState(false);
  const [autoRunInterval, setAutoRunInterval] = useState(DEFAULT_INTERVAL);
  const [sensitivity, setSensitivity] = useState(DEFAULT_SENSITIVITY);

  useEffect(() => {
    if (!chatId) return;
    const service = d.ChatSettingsService(chatId);

    const loadSettings = async () => {
      const settings = await service.Get();
      setAutoRunEnabled(settings?.agentFlowAutoRunEnabled ?? false);
      setAutoRunInterval(
        settings?.agentFlowAutoRunInterval ?? DEFAULT_INTERVAL,
      );
      setSensitivity(settings?.agentFlowSensitivity ?? DEFAULT_SENSITIVITY);
    };

    const unsubscribe = service.subscribe(() => {
      void loadSettings();
    });
    void loadSettings();

    return unsubscribe;
  }, [chatId]);

  if (!chatId) return null;

  const updateSettings = (
    updates: Partial<{
      agentFlowAutoRunEnabled: boolean;
      agentFlowAutoRunInterval: number;
      agentFlowSensitivity: number;
      agentFlowMessagesSinceLastRun: number;
    }>,
  ) => {
    void d.ChatSettingsService(chatId).update(updates);
  };

  const setEnabled = (enabled: boolean) => {
    setAutoRunEnabled(enabled);
    updateSettings({
      agentFlowAutoRunEnabled: enabled,
      agentFlowMessagesSinceLastRun: 0,
    });
  };

  const setIntervalValue = (value: number | string) => {
    const numeric = typeof value === "number" ? value : Number(value);
    const nextValue = Number.isFinite(numeric)
      ? Math.max(1, Math.round(numeric))
      : DEFAULT_INTERVAL;

    setAutoRunInterval(nextValue);
    updateSettings({
      agentFlowAutoRunInterval: nextValue,
      agentFlowMessagesSinceLastRun: 0,
    });
  };

  const setSensitivityValue = (value: number) => {
    const nextValue = Math.min(100, Math.max(0, Math.round(value)));
    setSensitivity(nextValue);
    updateSettings({ agentFlowSensitivity: nextValue });
  };

  return (
    <Page>
      <Paper mt={20} p="xl">
        <PageHeader onBack={() => navigate(`/chat/${chatId}`)} />

        <Stack gap="xl">
          <Stack gap="xs">
            <Switch
              checked={autoRunEnabled}
              onChange={(event) => setEnabled(event.currentTarget.checked)}
              label="Automatically analyze Agent Flow after saved user messages"
              description="Auto analysis updates suggestions only. Actions still require a click."
            />

            <NumberInput
              label="Messages between automatic intent checks"
              description="Agent Flow runs after this many saved user messages when auto analysis is enabled."
              value={autoRunInterval}
              min={1}
              max={100}
              step={1}
              onChange={setIntervalValue}
              disabled={!autoRunEnabled}
            />
          </Stack>

          <Divider />

          <Stack gap="sm">
            <Group justify="space-between" align="flex-end">
              <div>
                <Text fw={600}>Intent boldness</Text>
                <Text size="sm" c="dimmed">
                  {getSensitivityDescription(sensitivity)}
                </Text>
              </div>
              <NumberInput
                value={sensitivity}
                min={0}
                max={100}
                step={1}
                onChange={(value) =>
                  setSensitivityValue(
                    typeof value === "number" ? value : Number(value),
                  )
                }
                w={96}
                aria-label="Agent Flow intent boldness"
              />
            </Group>

            <Slider
              value={sensitivity}
              min={0}
              max={100}
              step={1}
              marks={[
                { value: 0, label: "Conservative" },
                { value: 50, label: "Balanced" },
                { value: 100, label: "Proactive" },
              ]}
              onChange={setSensitivityValue}
            />
          </Stack>
        </Stack>
      </Paper>
    </Page>
  );
};

const PageHeader: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <>
    <Group justify="space-between" align="center" mb="md">
      <Group>
        <ActionIcon onClick={onBack} variant="subtle" size="lg">
          <RiArrowLeftLine color={Theme.page.text} />
        </ActionIcon>
        <RiSparkling2Line size={24} color={Theme.plan.primary} />
        <Title order={2} fw={400} style={{ color: Theme.plan.primary }}>
          Agent Flow
        </Title>
      </Group>
    </Group>
    <Divider mb="xl" style={{ borderColor: Theme.plan.border }} />
  </>
);

const getSensitivityDescription = (value: number): string => {
  if (value <= 33) {
    return "Conservative: only suggest actions when the benefit is obvious.";
  }

  if (value <= 66) {
    return "Balanced: suggest actions when they are likely useful.";
  }

  return "Proactive: favor useful actions and ask clarifying questions when details are missing.";
};
