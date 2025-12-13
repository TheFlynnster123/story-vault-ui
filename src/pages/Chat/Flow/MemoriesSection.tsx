import React, { useState } from "react";
import { Box, Group, Text } from "@mantine/core";
import { LuBrain } from "react-icons/lu";
import { ChatTheme } from "../../../theme/chatTheme";
import { FlowButton } from "./FlowButton";
import { PreviewItem } from "./PreviewItem";
import { ContentPreview } from "./ContentPreview";
import type { Memory } from "../../../models/Memory";
import { useMemories } from "../../../hooks/useMemories";

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
        leftSection={<LuBrain size={18} color={ChatTheme.memories.primary} />}
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
