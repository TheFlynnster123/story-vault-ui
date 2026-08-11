import React, { useState } from "react";
import { Modal, Text, Group, Button, Stack } from "@mantine/core";
import { RiMagicLine, RiEdit2Line, RiArrowRightLine } from "react-icons/ri";
import type { PreferredImage } from "../../../Characters/services/CharacterDescription";
import { CharacterImageModelModal } from "../../../Images/components/CharacterImageModelModal";

interface MissingCharacterDescriptionModalProps {
  isOpen: boolean;
  chatId: string;
  characterName: string;
  isWorking?: boolean;
  onGenerate: (preferredImage: PreferredImage | undefined) => void;
  onCreateManually: () => void;
  onSkip: () => void;
  onCancel: () => void;
}

export const MissingCharacterDescriptionModal: React.FC<
  MissingCharacterDescriptionModalProps
> = ({
  isOpen,
  chatId,
  characterName,
  isWorking = false,
  onGenerate,
  onCreateManually,
  onSkip,
  onCancel,
}) => {
  const [isChoosingImageModel, setIsChoosingImageModel] = useState(false);

  return (
    <>
      <Modal
        opened={isOpen && !isChoosingImageModel}
        onClose={isWorking ? () => undefined : onCancel}
        title="Character appearance needed"
        size="md"
        centered
        closeOnClickOutside={!isWorking}
        closeOnEscape={!isWorking}
      >
        <Stack gap="sm">
          <Text size="sm">
            The scene focuses on <b>{characterName}</b>, but this character does
            not have a saved character appearance yet.
          </Text>
          <Text size="sm" c="dimmed">
            Choose how to continue image generation.
          </Text>

          <Group mt="xs" grow>
            <Button
              leftSection={<RiMagicLine size={16} />}
              onClick={() => setIsChoosingImageModel(true)}
              color="indigo"
              loading={isWorking}
              disabled={isWorking}
            >
              Generate Appearance
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

      <CharacterImageModelModal
        opened={isOpen && isChoosingImageModel}
        chatId={chatId}
        title={`Image Model for ${characterName}`}
        noSelectionLabel="System default"
        noSelectionDescription="Leave blank to use the system default"
        onClose={() => setIsChoosingImageModel(false)}
        onSelect={(selection) => {
          setIsChoosingImageModel(false);
          onGenerate(selection);
        }}
      />
    </>
  );
};
