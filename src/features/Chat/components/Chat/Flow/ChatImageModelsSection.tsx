import React from "react";
import { Box, Group, Text } from "@mantine/core";
import { RiImageLine } from "react-icons/ri";
import { FlowButton } from "./FlowButton";
import { FlowStyles } from "./FlowStyles";
import { useChatImageModels } from "../../../../Images/hooks/useChatImageModels";
import { Theme } from "../../../../../components/Theme";

interface ChatImageModelsSectionProps {
  chatId: string;
  onNavigate: () => void;
}

const truncateModelName = (name: string, maxLen = 28): string =>
  name.length > maxLen ? name.slice(0, maxLen) + "…" : name;

export const ChatImageModelsSection: React.FC<ChatImageModelsSectionProps> = ({
  chatId,
  onNavigate,
}) => {
  const { getSelectedModel } = useChatImageModels(chatId);

  const selectedModel = getSelectedModel();
  const isSelected = !!selectedModel;
  const displayName = selectedModel?.name ?? "Default";
  const sourceLabel = isSelected ? "(chat)" : "(using system default)";

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
          onClick={onNavigate}
          leftSection={
            <RiImageLine size={18} color={Theme.imageModel.primary} />
          }
        >
          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
            <Text size="sm" fw={500} style={{ flexShrink: 0 }}>
              Image Model
            </Text>
            <Text
              size="xs"
              style={{
                color: isSelected
                  ? Theme.imageModel.primary
                  : "rgba(255, 255, 255, 0.35)",
                flexShrink: 0,
              }}
            >
              {sourceLabel}
            </Text>
            <Text
              size="xs"
              c="dimmed"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {truncateModelName(displayName)}
            </Text>
          </Group>
        </FlowButton>
      </Box>
    </Box>
  );
};
