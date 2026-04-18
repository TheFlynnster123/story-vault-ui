import React from "react";
import { Modal, Stack, Text, UnstyledButton, Group } from "@mantine/core";
import { RiBookOpenLine, RiBookLine } from "react-icons/ri";
import { Theme } from "../../../../../components/Theme";
import { FlowStyles } from "./FlowStyles";

interface CompressionPickerModalProps {
  opened: boolean;
  onClose: () => void;
  onSelectChapter: () => void;
  onSelectBook: () => void;
}

export const CompressionPickerModal: React.FC<CompressionPickerModalProps> = ({
  opened,
  onClose,
  onSelectChapter,
  onSelectBook,
}) => (
  <Modal opened={opened} onClose={onClose} title="Compress" size="lg">
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Compression reduces the context window sent to the AI by summarizing
        past content. This keeps conversations fast and focused while preserving
        the key details of your story.
      </Text>

      <Group grow gap="md">
        <CompressionOption
          icon={<RiBookOpenLine size={28} color={Theme.chapter.primary} />}
          label="Compress to Chapter"
          description="Summarize recent messages into a single chapter."
          borderColor={Theme.chapter.border}
          onClick={() => {
            onClose();
            onSelectChapter();
          }}
        />
        <CompressionOption
          icon={<RiBookLine size={28} color={Theme.book.primary} />}
          label="Compress to Book"
          description="Combine existing chapters into a higher-level book summary."
          borderColor={Theme.book.border}
          onClick={() => {
            onClose();
            onSelectBook();
          }}
        />
      </Group>
    </Stack>
  </Modal>
);

interface CompressionOptionProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  borderColor: string;
  onClick: () => void;
}

const CompressionOption: React.FC<CompressionOptionProps> = ({
  icon,
  label,
  description,
  borderColor,
  onClick,
}) => (
  <UnstyledButton
    onClick={onClick}
    style={{
      border: `1px solid ${borderColor}`,
      borderRadius: 8,
      padding: 20,
      backgroundColor: FlowStyles.buttonBackground,
      cursor: "pointer",
      transition: "background-color 150ms ease",
    }}
    styles={{
      root: {
        "&:hover": {
          backgroundColor: FlowStyles.buttonHover,
        },
      },
    }}
  >
    <Stack align="center" gap="sm">
      {icon}
      <Text fw={600} size="md" ta="center">
        {label}
      </Text>
      <Text size="xs" c="dimmed" ta="center">
        {description}
      </Text>
    </Stack>
  </UnstyledButton>
);
