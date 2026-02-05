import React from "react";
import {
  ActionIcon,
  Group,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { VscRefresh } from "react-icons/vsc";

interface PromptInputProps {
  id: string;
  label: string;
  helpText: string;
  value: string;
  isHighlighted: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
  minRows?: number;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  id,
  label,
  helpText,
  value,
  isHighlighted,
  onChange,
  onReset,
  minRows = 4,
}) => (
  <Stack
    gap="xs"
    id={id}
    style={{
      padding: "12px",
      borderRadius: "8px",
      backgroundColor: isHighlighted ? "rgba(255, 152, 0, 0.1)" : "transparent",
      border: isHighlighted
        ? "2px solid rgba(255, 152, 0, 0.5)"
        : "2px solid transparent",
      transition: "all 0.3s ease",
    }}
  >
    <Group justify="space-between" align="center" mb={0}>
      <Text fw={600} size="md" c="orange">
        {label}
      </Text>
      <Tooltip label="Reset to default">
        <ActionIcon variant="light" size="sm" onClick={onReset} color="orange">
          <VscRefresh size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
    <Textarea
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      minRows={minRows}
      autosize
    />
    <Text size="sm" c="dimmed">
      {helpText}
    </Text>
  </Stack>
);
