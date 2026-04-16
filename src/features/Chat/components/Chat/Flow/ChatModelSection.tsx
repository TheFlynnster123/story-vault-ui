import React, { useState } from "react";
import { Box, Group, Text } from "@mantine/core";
import { RiRobot2Line, RiCloseLine } from "react-icons/ri";
import { FlowButton } from "./FlowButton";
import { FlowStyles } from "./FlowStyles";
import { useChatModelOverride } from "../../../hooks/useChatModelOverride";
import { ModelSelectorModal } from "../../../../../features/AI/components/ModelSelectorModal";

interface ChatModelSectionProps {
  chatId: string;
}

const truncateModelName = (name: string, maxLen = 28): string =>
  name.length > maxLen ? name.slice(0, maxLen) + "…" : name;

export const ChatModelSection: React.FC<ChatModelSectionProps> = ({
  chatId,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    activeModelId,
    activeModel,
    isOverridden,
    setModelOverride,
    clearModelOverride,
    isLoading,
  } = useChatModelOverride(chatId);

  const displayName = activeModel?.name ?? activeModelId ?? "Default";
  const sourceLabel = isOverridden ? "chat" : "default";

  const handleClearOverride = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await clearModelOverride();
  };

  return (
    <Box>
      <FlowButton
        onClick={() => setIsModalOpen(true)}
        leftSection={
          <RiRobot2Line size={18} color="rgba(100, 149, 237, 1)" />
        }
      >
        <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500}>
            Chat Model
          </Text>
        </Group>
      </FlowButton>

      {/* Current model display */}
      <Box
        px="sm"
        py={6}
        style={{
          backgroundColor: FlowStyles.buttonBackground,
          borderRadius: "0 0 4px 4px",
          marginTop: "-2px",
        }}
      >
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
            <Text
              size="xs"
              c="dimmed"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {isLoading ? "Loading..." : truncateModelName(displayName)}
            </Text>
            <Text
              size="xs"
              style={{
                color: isOverridden
                  ? "rgba(100, 149, 237, 0.8)"
                  : "rgba(255, 255, 255, 0.35)",
                fontSize: "10px",
                flexShrink: 0,
              }}
            >
              ({sourceLabel})
            </Text>
          </Group>

          {isOverridden && (
            <button
              onClick={handleClearOverride}
              title="Clear model override — revert to system default"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(248, 113, 113, 0.8)",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <RiCloseLine size={14} />
            </button>
          )}
        </Group>
      </Box>

      <ModelSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedModelId={activeModelId}
        onSelect={(modelId) => setModelOverride(modelId)}
      />
    </Box>
  );
};
