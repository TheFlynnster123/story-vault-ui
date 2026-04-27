import React from "react";
import { Modal, Text, Group, Button, Stack } from "@mantine/core";
import { RiMagicLine, RiEdit2Line, RiArrowRightLine } from "react-icons/ri";

interface MissingCharacterDescriptionModalProps {
  isOpen: boolean;
  characterName: string;
  isWorking?: boolean;
  onGenerate: () => void;
  onCreateManually: () => void;
  onSkip: () => void;
  onCancel: () => void;
}

export const MissingCharacterDescriptionModal: React.FC<
  MissingCharacterDescriptionModalProps
> = ({
  isOpen,
  characterName,
  isWorking = false,
  onGenerate,
  onCreateManually,
  onSkip,
  onCancel,
}) => (
  <Modal
    opened={isOpen}
    onClose={isWorking ? () => undefined : onCancel}
    title="Character description needed"
    size="md"
    centered
    closeOnClickOutside={!isWorking}
    closeOnEscape={!isWorking}
  >
    <Stack gap="sm">
      <Text size="sm">
        The scene focuses on <b>{characterName}</b>, but this character does not
        have a saved physical description yet.
      </Text>
      <Text size="sm" c="dimmed">
        Choose how to continue image generation.
      </Text>

      <Group mt="xs" grow>
        <Button
          leftSection={<RiMagicLine size={16} />}
          onClick={onGenerate}
          color="indigo"
          loading={isWorking}
          disabled={isWorking}
        >
          Generate Description
        </Button>
        <Button
          leftSection={<RiEdit2Line size={16} />}
          variant="default"
          onClick={onCreateManually}
          disabled={isWorking}
        >
          Create Manually
        </Button>
      </Group>

      <Button
        leftSection={<RiArrowRightLine size={16} />}
        variant="subtle"
        color="gray"
        onClick={onSkip}
        disabled={isWorking}
      >
        Skip for now
      </Button>
    </Stack>
  </Modal>
);
