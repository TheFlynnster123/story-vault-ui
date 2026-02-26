import React, { useState } from "react";
import { Box, Group, Text } from "@mantine/core";
import { LuBrain } from "react-icons/lu";
import { Theme } from "../../../components/Theme";
import type { Memory } from "../services/Memory";
import { useMemories } from "../hooks/useMemories";
import { PreviewItem } from "../../Chat/components/Chat/Flow/PreviewItem";
import { FlowButton } from "../../Chat/components/Chat/Flow/FlowButton";
import { ContentPreview } from "../../Chat/components/Chat/Flow/ContentPreview";

interface MemoriesSectionProps {
  chatId: string;
  onNavigate: () => void;
}

export const MemoriesSection: React.FC<MemoriesSectionProps> = ({
  chatId,
  onNavigate,
}) => {
  const { memories } = useMemories(chatId);
  const [isExpanded, setIsExpanded] = useState(false);

  const renderMemoryItem = (memory: Memory) => (
    <PreviewItem
      key={memory.id}
      content={memory.content}
      isExpanded={isExpanded}
    />
  );

  return (
    <Box>
      <FlowButton
        onClick={onNavigate}
        leftSection={<LuBrain size={18} color={Theme.memories.primary} />}
      >
        <Group gap="xs">
          <Text size="sm" fw={500}>
            Memories
          </Text>
          <Text size="xs" c="dimmed">
            ({memories.length})
          </Text>
        </Group>
      </FlowButton>
      <ContentPreview
        items={memories}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        renderItem={renderMemoryItem}
        emptyMessage="No memories saved"
      />
    </Box>
  );
};
