import React from "react";
import { Group, Text } from "@mantine/core";
import { RiBookLine } from "react-icons/ri";
import { Theme } from "../../../../../components/Theme";
import { FlowButton } from "./FlowButton";

interface CompressToBookButtonProps {
  onClick: () => void;
}

export const CompressToBookButton: React.FC<CompressToBookButtonProps> = ({
  onClick,
}) => (
  <FlowButton
    onClick={onClick}
    leftSection={<RiBookLine size={18} color={Theme.book.primary} />}
  >
    <Group gap="xs">
      <Text size="sm" fw={500}>
        Compress to Book
      </Text>
    </Group>
  </FlowButton>
);
