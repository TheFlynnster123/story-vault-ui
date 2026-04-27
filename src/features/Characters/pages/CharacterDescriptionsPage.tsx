import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RiArrowLeftLine, RiAddLine, RiDeleteBinLine } from "react-icons/ri";
import { FaUser } from "react-icons/fa";
import {
  Title,
  Button,
  Group,
  Paper,
  ActionIcon,
  Stack,
  Textarea,
  TextInput,
  Text,
  Divider,
} from "@mantine/core";
import type { CharacterDescription } from "../services/CharacterDescription";
import {
  createCharacterDescription,
  updateCharacterDescription,
} from "../services/CharacterDescription";
import { useCharacterDescriptions } from "../hooks/useCharacterDescriptions";
import { Page } from "../../../components/Page";
import { Theme } from "../../../components/Theme";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { d } from "../../../services/Dependencies";

export const CharacterDescriptionsPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();

  const { characters, isLoading } = useCharacterDescriptions(chatId!);
  const [formCharacters, setFormCharacters] = useState<CharacterDescription[]>(
    [],
  );
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [characterToDeleteId, setCharacterToDeleteId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isLoading) {
      setFormCharacters([...characters]);
    }
  }, [isLoading, characters]);

  const handleAddCharacter = () => {
    const newCharacter = createCharacterDescription("", "");
    const updatedCharacters = [...formCharacters, newCharacter];
    setFormCharacters(updatedCharacters);
    d.CharacterDescriptionsService(chatId!).saveDebounced(updatedCharacters);
  };

  const handleCharacterNameChange = (id: string, name: string) => {
    const updatedCharacters = formCharacters.map((character) =>
      character.id === id
        ? updateCharacterDescription(character, { name })
        : character,
    );
    setFormCharacters(updatedCharacters);

    d.CharacterDescriptionsService(chatId!).saveDebounced(updatedCharacters);
  };

  const handleCharacterDescriptionChange = (
    id: string,
    description: string,
  ) => {
    const updatedCharacters = formCharacters.map((character) =>
      character.id === id
        ? updateCharacterDescription(character, { description })
        : character,
    );
    setFormCharacters(updatedCharacters);

    d.CharacterDescriptionsService(chatId!).saveDebounced(updatedCharacters);
  };

  const onRemoveCharacter = (id: string) => {
    setCharacterToDeleteId(id);
    setIsConfirmModalOpen(true);
  };

  const onConfirmRemoveCharacter = async () => {
    if (characterToDeleteId) {
      await d
        .CharacterDescriptionsService(chatId!)
        .removeDescription(characterToDeleteId);

      const updatedCharacters = await d
        .CharacterDescriptionsService(chatId!)
        .get();

      setFormCharacters(updatedCharacters);
    }

    setIsConfirmModalOpen(false);
    setCharacterToDeleteId(null);
  };

  const handleGoBack = async () => {
    await d.CharacterDescriptionsService(chatId!).save(formCharacters);
    navigate(`/chat/${chatId}`);
  };

  return (
    <Page>
      <Paper mt={20}>
        <CharacterDescriptionsHeader onGoBack={handleGoBack} />

        <Stack>
          <Text size="sm" style={{ color: Theme.page.textMuted }}>
            Character descriptions help maintain visual consistency across image
            generations. Describe permanent physical features like face shape,
            eye color, hair, age, and build. Clothing and contextual details
            will be added automatically based on each scene.
          </Text>
          <Divider style={{ borderColor: Theme.character.border }} />
          <Group justify="space-between">
            <Text fw={500}>Characters</Text>
            <Button
              variant="subtle"
              onClick={handleAddCharacter}
              style={{ color: Theme.character.primary }}
            >
              <RiAddLine /> Add Character
            </Button>
          </Group>
          {formCharacters.length === 0 && (
            <Text size="sm" style={{ color: Theme.page.textMuted }}>
              No characters yet. Add one above or generate an image to
              automatically create character records.
            </Text>
          )}
          {formCharacters.map((character) => (
            <Stack key={character.id} gap="sm">
              <TextInput
                label="Character Name"
                placeholder="e.g., Sarah Chen"
                value={character.name}
                onChange={(e) =>
                  handleCharacterNameChange(character.id, e.currentTarget.value)
                }
                styles={{
                  input: {
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    borderColor: Theme.character.border,
                    color: Theme.page.text,
                  },
                  label: {
                    color: Theme.page.text,
                  },
                }}
              />
              <Textarea
                label="Physical Description"
                placeholder={
                  character.description.trim() === ""
                    ? "No character description was generated. Add physical features: face shape, eye color, hair, age, build, distinctive features..."
                    : "Describe physical features: face shape, eye color, hair, age, build, distinctive features..."
                }
                value={character.description}
                onChange={(e) =>
                  handleCharacterDescriptionChange(
                    character.id,
                    e.currentTarget.value,
                  )
                }
                minRows={3}
                autosize
                styles={{
                  input: {
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    borderColor: Theme.character.border,
                    color: Theme.page.text,
                  },
                  label: {
                    color: Theme.page.text,
                  },
                }}
              />
              <Button
                variant="outline"
                color="red"
                onClick={() => onRemoveCharacter(character.id)}
                style={{ alignSelf: "flex-start" }}
              >
                <RiDeleteBinLine /> Delete Character
              </Button>
              <Divider my="sm" style={{ borderColor: Theme.character.border }} />
            </Stack>
          ))}
        </Stack>
      </Paper>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={onConfirmRemoveCharacter}
        title="Confirm Deletion"
        message="Are you sure you want to delete this character?"
      />
    </Page>
  );
};

interface CharacterDescriptionsHeaderProps {
  onGoBack: () => void;
}

const CharacterDescriptionsHeader: React.FC<
  CharacterDescriptionsHeaderProps
> = ({ onGoBack }) => (
  <>
    <Group justify="space-between" align="center" mb="md">
      <Group>
        <ActionIcon onClick={onGoBack} variant="subtle" size="lg">
          <RiArrowLeftLine color={Theme.page.text} />
        </ActionIcon>
        <FaUser size={20} color={Theme.character.primary} />
        <Title order={2} fw={400} style={{ color: Theme.character.primary }}>
          Character Descriptions
        </Title>
      </Group>
    </Group>
    <Divider mb="xl" style={{ borderColor: Theme.character.border }} />
  </>
);
