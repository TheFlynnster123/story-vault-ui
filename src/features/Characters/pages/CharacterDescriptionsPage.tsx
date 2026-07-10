import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  RiArrowLeftLine,
  RiAddLine,
  RiDeleteBinLine,
  RiImageLine,
} from "react-icons/ri";
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
  Badge,
} from "@mantine/core";
import type { CharacterDescription } from "../services/CharacterDescription";
import type { PreferredImage } from "../services/CharacterDescription";
import {
  createCharacterDescription,
  updateCharacterDescription,
} from "../services/CharacterDescription";
import { useCharacterDescriptions } from "../hooks/useCharacterDescriptions";
import { Page } from "../../../components/Page";
import { Theme } from "../../../components/Theme";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { d } from "../../../services/Dependencies";
import { CharacterImageModelModal } from "../../Images/components/CharacterImageModelModal";

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
  const [modelPickerCharacterId, setModelPickerCharacterId] = useState<
    string | null
  >(null);

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

  const handleCharacterAppearanceChange = (
    id: string,
    appearance: string,
  ) => {
    const updatedCharacters = formCharacters.map((character) =>
      character.id === id
        ? updateCharacterDescription(character, { appearance })
        : character,
    );
    setFormCharacters(updatedCharacters);

    d.CharacterDescriptionsService(chatId!).saveDebounced(updatedCharacters);
  };

  const handleCharacterSheetChange = (id: string, sheet: string) => {
    const updatedCharacters = formCharacters.map((character) =>
      character.id === id
        ? updateCharacterDescription(character, { sheet, sheetSource: "manual" })
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

  const handlePreferredImageSelect = async (
    characterId: string,
    preferredImage: PreferredImage | undefined,
  ) => {
    const updatedCharacters = formCharacters.map((character) =>
      character.id === characterId
        ? updateCharacterDescription(character, { preferredImage })
        : character,
    );
    setFormCharacters(updatedCharacters);
    await d
      .CharacterDescriptionsService(chatId!)
      .updateCharacter(characterId, { preferredImage });
  };

  return (
    <Page>
      <Paper mt={20}>
        <CharacterDescriptionsHeader onGoBack={handleGoBack} />

        <Stack>
          <Text size="sm" style={{ color: Theme.page.textMuted }}>
            Character Sheets are durable story context used in every chat
            response. Character Appearance is used separately to keep image
            generations visually consistent.
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
                label="Character Sheet"
                description="Narrative facts such as role, personality, motivations, relationships, voice, and constraints."
                placeholder="No character sheet yet. Add durable facts the story should remember..."
                value={character.sheet ?? ""}
                onChange={(e) =>
                  handleCharacterSheetChange(
                    character.id,
                    e.currentTarget.value,
                  )
                }
                minRows={5}
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
              <Textarea
                label="Character Appearance"
                description="Stable physical traits used for image generation. Exclude actions, poses, scenes, and temporary clothing."
                placeholder={
                  character.appearance.trim() === ""
                    ? "No character appearance was generated. Add face shape, eye color, hair, age, build, distinctive features..."
                    : "Describe physical features: face shape, eye color, hair, age, build, distinctive features..."
                }
                value={character.appearance}
                onChange={(e) =>
                  handleCharacterAppearanceChange(
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
              <Group gap="xs" align="center">
                <Text size="sm" style={{ color: Theme.page.text }}>
                  Preferred Image Model:
                </Text>
                {character.preferredImage ? (
                  <Badge
                    size="sm"
                    color={
                      character.preferredImage.source === "variant"
                        ? "violet"
                        : "teal"
                    }
                    variant="light"
                  >
                    {character.preferredImage.source}
                  </Badge>
                ) : (
                  <Text size="sm" c="dimmed">
                    None (uses chat default)
                  </Text>
                )}
                <Button
                  size="xs"
                  variant="subtle"
                  leftSection={<RiImageLine size={12} />}
                  style={{ color: Theme.character.primary }}
                  onClick={() => setModelPickerCharacterId(character.id)}
                >
                  Change
                </Button>
              </Group>
              <Button
                variant="outline"
                color="red"
                onClick={() => onRemoveCharacter(character.id)}
                style={{ alignSelf: "flex-start" }}
              >
                <RiDeleteBinLine /> Delete Character
              </Button>
              <Divider
                my="sm"
                style={{ borderColor: Theme.character.border }}
              />
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

      {modelPickerCharacterId && (
        <CharacterImageModelModal
          opened={!!modelPickerCharacterId}
          onClose={() => setModelPickerCharacterId(null)}
          chatId={chatId!}
          currentSelection={
            formCharacters.find((c) => c.id === modelPickerCharacterId)
              ?.preferredImage
          }
          onSelect={(selection) => {
            handlePreferredImageSelect(modelPickerCharacterId, selection);
            setModelPickerCharacterId(null);
          }}
        />
      )}
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
          Characters
        </Title>
      </Group>
    </Group>
    <Divider mb="xl" style={{ borderColor: Theme.character.border }} />
  </>
);
