import React from "react";
import { ActionIcon, Box, Group, Switch, Text, Tooltip } from "@mantine/core";
import { RiSettings3Line } from "react-icons/ri";
import { LuBrain } from "react-icons/lu";
import { Theme } from "../../../../../components/Theme";
import { d } from "../../../../../services/Dependencies";
import { useChatSettings } from "../../../hooks/useChatSettings";
import { FlowButton } from "./FlowButton";
import { FlowStyles } from "./FlowStyles";

interface ReasoningSectionProps {
  chatId: string;
  onNavigateToSettings: () => void;
}

export const ReasoningSection: React.FC<ReasoningSectionProps> = ({
  chatId,
  onNavigateToSettings,
}) => {
  const { chatSettings } = useChatSettings(chatId);
  const enabled = chatSettings?.reasoningEnabled ?? true;
  const hasPromptOverride = !!chatSettings?.reasoningPromptOverride?.trim();

  const setEnabled = (event: React.ChangeEvent<HTMLInputElement>) => {
    void d
      .ChatSettingsService(chatId)
      .setReasoningEnabled(event.currentTarget.checked);
  };

  return (
    <Box
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: FlowStyles.buttonBackground,
        borderRadius: "4px",
      }}
    >
      <Box style={{ flex: 1, minWidth: 0 }}>
        <FlowButton
          onClick={onNavigateToSettings}
          leftSection={<LuBrain size={18} color={Theme.plan.primary} />}
        >
          <Group justify="space-between" wrap="nowrap" style={{ width: "100%" }}>
            <Box ta="left" style={{ minWidth: 0 }}>
              <Text size="sm" fw={500}>
                Reasoning
              </Text>
              <Text size="xs" c="dimmed">
                {enabled
                  ? hasPromptOverride
                    ? "Enabled with chat prompt"
                    : "Enabled with system prompt"
                  : "Disabled for this chat"}
              </Text>
            </Box>
          </Group>
        </FlowButton>
      </Box>

      <Group gap={4} wrap="nowrap" style={{ flexShrink: 0, marginRight: 4 }}>
        <Switch
          checked={enabled}
          onChange={setEnabled}
          size="sm"
          aria-label="Enable reasoning"
        />
        <Tooltip label="Reasoning settings">
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            onClick={onNavigateToSettings}
            aria-label="Reasoning settings"
          >
            <RiSettings3Line size={16} color="rgba(255, 255, 255, 0.7)" />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
};
