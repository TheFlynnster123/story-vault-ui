import React from "react";
import { Group, Text } from "@mantine/core";
import { RiChatSettingsLine } from "react-icons/ri";
import { ChatTheme } from "../../../theme/chatTheme";
import { FlowButton } from "./FlowButton";

interface ChatSettingsButtonProps {
  onClick: () => void;
}

export const ChatSettingsButton: React.FC<ChatSettingsButtonProps> = ({
  onClick,
}) => (
  <FlowButton
    onClick={onClick}
    leftSection={
      <RiChatSettingsLine size={18} color={ChatTheme.chatSettings.primary} />
    }
  >
    <Group gap="xs">
      <Text size="sm" fw={500}>
        Chat Settings
      </Text>
    </Group>
  </FlowButton>
);
