import React from "react";
import { Group, Text } from "@mantine/core";
import { RiStickyNoteLine } from "react-icons/ri";
import { Theme } from "../../../../../components/Theme";
import { FlowButton } from "./FlowButton";

interface AddNoteButtonProps {
  onClick: () => void;
}

export const AddNoteButton: React.FC<AddNoteButtonProps> = ({ onClick }) => (
  <FlowButton
    onClick={onClick}
    leftSection={<RiStickyNoteLine size={18} color={Theme.note.primary} />}
  >
    <Group gap="xs">
      <Text size="sm" fw={500}>
        Add Note
      </Text>
    </Group>
  </FlowButton>
);
