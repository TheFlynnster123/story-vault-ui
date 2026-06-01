import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ActionIcon,
  Button,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Paper,
  Stack,
  Switch,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { RiArrowLeftLine } from "react-icons/ri";
import { LuBrain } from "react-icons/lu";
import { Page } from "../../../components/Page";
import { Theme } from "../../../components/Theme";
import { d } from "../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";
import { DEFAULT_REASONING_RETENTION_MESSAGES } from "../services/Chat/ChatSettings";

export const ReasoningSettingsPage: React.FC = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [enabled, setEnabledState] = useState(true);
  const [hasExpiration, setHasExpiration] = useState(true);
  const [expiresAfterMessages, setExpiresAfterMessages] = useState(
    DEFAULT_REASONING_RETENTION_MESSAGES,
  );
  const [promptOverride, setPromptOverrideState] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    DEFAULT_SYSTEM_PROMPTS.reasoningPrompt,
  );

  useEffect(() => {
    if (!chatId) return;
    const service = d.ChatSettingsService(chatId);

    const loadSettings = async () => {
      const [settings, prompts] = await Promise.all([
        service.Get(),
        d.SystemPromptsService().Get(),
      ]);
      setEnabledState(settings?.reasoningEnabled ?? true);
      setHasExpiration(settings?.reasoningExpiresAfterMessages !== null);
      setExpiresAfterMessages(
        settings?.reasoningExpiresAfterMessages ??
          DEFAULT_REASONING_RETENTION_MESSAGES,
      );
      setPromptOverrideState(settings?.reasoningPromptOverride ?? "");
      setSystemPrompt(
        prompts?.reasoningPrompt || DEFAULT_SYSTEM_PROMPTS.reasoningPrompt,
      );
    };

    const unsubscribe = service.subscribe(() => {
      void loadSettings();
    });
    void loadSettings();

    return unsubscribe;
  }, [chatId]);

  if (!chatId) return null;

  const setEnabled = (value: boolean) => {
    setEnabledState(value);
    void d.ChatSettingsService(chatId).setReasoningEnabled(value);
  };

  const setPromptOverride = (value: string) => {
    setPromptOverrideState(value);
    void d
      .ChatSettingsService(chatId)
      .setReasoningPromptOverride(value.trim() ? value : undefined);
  };

  const clearPromptOverride = () => {
    setPromptOverrideState("");
    void d.ChatSettingsService(chatId).setReasoningPromptOverride(undefined);
  };

  const setExpirationEnabled = (value: boolean) => {
    setHasExpiration(value);
    void d
      .ChatSettingsService(chatId)
      .setReasoningExpiresAfterMessages(
        value ? expiresAfterMessages : null,
      );
  };

  const setExpirationCount = (value: number | string) => {
    const numeric = typeof value === "number" ? value : Number(value);
    const nextValue = Number.isFinite(numeric)
      ? Math.max(1, Math.round(numeric))
      : DEFAULT_REASONING_RETENTION_MESSAGES;

    setExpiresAfterMessages(nextValue);
    if (hasExpiration) {
      void d
        .ChatSettingsService(chatId)
        .setReasoningExpiresAfterMessages(nextValue);
    }
  };

  return (
    <Page>
      <Paper mt={20} p="xl">
        <PageHeader onBack={() => navigate(`/chat/${chatId}`)} />

        <Stack gap="xl">
          <Switch
            checked={enabled}
            onChange={(event) => setEnabled(event.currentTarget.checked)}
            label="Generate reasoning before assistant responses"
            description="When enabled, each new user turn creates a reasoning message, saves it in the chat chain, then generates the assistant response with that reasoning in context."
          />

          <Stack gap="xs">
            <Checkbox
              checked={hasExpiration}
              onChange={(event) =>
                setExpirationEnabled(event.currentTarget.checked)
              }
              disabled={!enabled}
              label="Disable reasoning messages after newer chat messages"
              description="Disabled reasoning stays visible in the chat history, but is no longer sent to the LLM."
            />

            <NumberInput
              label="Messages before reasoning is disabled"
              value={expiresAfterMessages}
              min={1}
              max={100}
              step={1}
              onChange={setExpirationCount}
              disabled={!enabled || !hasExpiration}
            />
          </Stack>

          <Divider />

          <Stack gap="sm">
            <Group justify="space-between" align="flex-end">
              <div>
                <Text fw={600}>Chat reasoning prompt</Text>
                <Text size="sm" c="dimmed">
                  Leave blank to use the system reasoning prompt.
                </Text>
              </div>
              <Button
                size="compact-sm"
                variant="light"
                color="gray"
                onClick={clearPromptOverride}
                disabled={!promptOverride.trim()}
              >
                Use System Prompt
              </Button>
            </Group>

            <Textarea
              value={promptOverride}
              onChange={(event) => setPromptOverride(event.currentTarget.value)}
              minRows={8}
              autosize
              disabled={!enabled}
              placeholder={systemPrompt}
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
        <LuBrain size={24} color={Theme.plan.primary} />
        <Title order={2} fw={400} style={{ color: Theme.plan.primary }}>
          Reasoning
        </Title>
      </Group>
    </Group>
    <Divider mb="xl" style={{ borderColor: Theme.plan.border }} />
  </>
);
