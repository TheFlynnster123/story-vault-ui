import React from "react";
import { Group, Text } from "@mantine/core";
import { CgPushChevronDown } from "react-icons/cg";
import { FlowButton } from "./FlowButton";

interface CompressButtonProps {
  onClick: () => void;
}

export const CompressButton: React.FC<CompressButtonProps> = ({ onClick }) => (
  <FlowButton
    onClick={onClick}
    leftSection={<CgPushChevronDown size={18} color="#e6b800" />}
  >
    <Group gap="xs">
      <Text size="sm" fw={500}>
        Compress
      </Text>
    </Group>
  </FlowButton>
);
