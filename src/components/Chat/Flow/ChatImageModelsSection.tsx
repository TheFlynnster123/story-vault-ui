import React, { useState } from "react";
import { Box, Group, Text } from "@mantine/core";
import { RiImageLine } from "react-icons/ri";
import { Theme } from "../../Common/Theme";
import { FlowButton } from "./FlowButton";
import { PreviewItem } from "./PreviewItem";
import { ContentPreview } from "./ContentPreview";
import { useChatImageModels } from "../useChatImageModels";

interface ChatImageModelsSectionProps {
  chatId: string;
  onNavigate: () => void;
}

export const ChatImageModelsSection: React.FC<ChatImageModelsSectionProps> = ({
  chatId,
  onNavigate,
}) => {
  const { chatImageModels, getSelectedModel } = useChatImageModels(chatId);
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedModel = getSelectedModel();

  const renderModelItem = (model: { id: string; name: string }) => (
    <PreviewItem
      key={model.id}
      name={model.name}
      content={selectedModel?.id === model.id ? "(Selected)" : ""}
      isExpanded={isExpanded}
    />
  );

  return (
    <Box>
      <FlowButton
        onClick={onNavigate}
        leftSection={
          <RiImageLine size={18} color={Theme.chatSettings.primary} />
        }
      >
        <Group gap="xs">
          <Text size="sm" fw={500}>
            Chat Image Models
          </Text>
          <Text size="xs" c="dimmed">
            ({chatImageModels.models.length})
          </Text>
        </Group>
      </FlowButton>
      <ContentPreview
        items={chatImageModels.models}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        renderItem={renderModelItem}
        emptyMessage="Using default model"
      />
    </Box>
  );
};
