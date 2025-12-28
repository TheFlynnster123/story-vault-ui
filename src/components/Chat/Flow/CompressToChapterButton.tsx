import React from "react";
import { Group, Text } from "@mantine/core";
import { RiBookOpenLine } from "react-icons/ri";
import { Theme } from "../../Common/Theme";
import { FlowButton } from "./FlowButton";

interface CompressToChapterButtonProps {
  onClick: () => void;
}

export const CompressToChapterButton: React.FC<
  CompressToChapterButtonProps
> = ({ onClick }) => (
  <FlowButton
    onClick={onClick}
    leftSection={<RiBookOpenLine size={18} color={Theme.chapter.primary} />}
  >
    <Group gap="xs">
      <Text size="sm" fw={500}>
        Compress to Chapter
      </Text>
    </Group>
  </FlowButton>
);
