import { useEffect, useState } from "react";
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { FaUser } from "react-icons/fa";
import { RiAddLine, RiArrowLeftLine } from "react-icons/ri";
import { useNavigate, useParams } from "react-router-dom";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { Page } from "../../../components/Page";
import { Theme } from "../../../components/Theme";
import { d } from "../../../services/Dependencies";
import { CharacterImageModelModal } from "../../Images/components/CharacterImageModelModal";
import { CharacterCard } from "../components/CharacterCard";
import { CharacterSettingsPanel } from "../components/CharacterSettingsPanel";
import { useCharacterDescriptions } from "../hooks/useCharacterDescriptions";
import { useCharacterUpdateProposal } from "../hooks/useCharacterUpdateProposal";
import type {
  CharacterDescription,
  CharacterDescriptionUpdate,
  PreferredImage,
} from "../services/CharacterDescription";
import {
  createCharacterDescription,
  updateCharacterDescription,
} from "../services/CharacterDescription";
import type { CharacterMaintenanceResult } from "../services/CharacterMaintenanceService";

export const CharacterDescriptionsPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { characters, isLoading } = useCharacterDescriptions(chatId ?? "");
  const { proposal } = useCharacterUpdateProposal(chatId ?? "");
  const [formCharacters, setFormCharacters] = useState<CharacterDescription[]>(
    [],
  );
  const [characterToDeleteId, setCharacterToDeleteId] = useState<string>();
  const [modelPickerCharacterId, setModelPickerCharacterId] =
    useState<string>();
  const [generatingCharacterIds, setGeneratingCharacterIds] = useState<
    Set<string>
  >(new Set());
  const [generationStatuses, setGenerationStatuses] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!isLoading) setFormCharacters([...characters]);
  }, [characters, isLoading]);

  if (!chatId) return null;

  const saveDebounced = (updatedCharacters: CharacterDescription[]) => {
    setFormCharacters(updatedCharacters);
    d.CharacterDescriptionsService(chatId).saveDebounced(updatedCharacters);
  };

  const updateCharacter = (id: string, updates: CharacterDescriptionUpdate) => {
    saveDebounced(
      formCharacters.map((character) =>
        character.id === id
          ? updateCharacterDescription(character, updates)
          : character,
      ),
    );
  };

  const addCharacter = () => {
    saveDebounced([...formCharacters, createCharacterDescription("", "")]);
  };

  const addSheetItem = (id: string) => {
    setFormCharacters((current) =>
      current.map((character) =>
        character.id === id
          ? { ...character, sheetItems: [...character.sheetItems, ""] }
          : character,
      ),
    );
  };

  const generateOrUpdate = async (characterId: string) => {
    setGenerationStatuses((current) => ({
      ...current,
      [characterId]: "",
    }));
    setGeneratingCharacterIds((current) => new Set(current).add(characterId));
    try {
      await d.CharacterDescriptionsService(chatId).save(formCharacters);
      const result = await d
        .CharacterMaintenanceService(chatId)
        .generateOrUpdateCharacter(characterId);
      setGenerationStatuses((current) => ({
        ...current,
        [characterId]: toGenerationStatus(result),
      }));
    } catch (error) {
      d.ErrorService().log("Failed to prepare Character Sheet update", error);
      setGenerationStatuses((current) => ({
        ...current,
        [characterId]: "The Character Sheet update could not be prepared.",
      }));
    } finally {
      setGeneratingCharacterIds((current) => {
        const updated = new Set(current);
        updated.delete(characterId);
        return updated;
      });
    }
  };

  const removeCharacter = async () => {
    if (!characterToDeleteId) return;
    await d
      .CharacterDescriptionsService(chatId)
      .removeDescription(characterToDeleteId);
    setCharacterToDeleteId(undefined);
  };

  const selectPreferredImage = async (
    characterId: string,
    preferredImage: PreferredImage | undefined,
  ) => {
    updateCharacter(characterId, { preferredImage });
    await d
      .CharacterDescriptionsService(chatId)
      .updateCharacter(characterId, { preferredImage });
  };

  const saveAndNavigate = async (target: string) => {
    await d.CharacterDescriptionsService(chatId).save(formCharacters);
    navigate(target);
  };

  return (
    <Page>
      <Paper mt={20}>
        <CharactersHeader
          onBack={() => void saveAndNavigate(`/chat/${chatId}`)}
        />

        <Stack gap="xl">
          <CharacterSettingsPanel
            chatId={chatId}
            hasPendingProposal={proposal !== undefined}
            onEditActivePrompt={() =>
              void saveAndNavigate("/system-prompts#activeCharactersPrompt")
            }
            onEditSheetPrompt={() =>
              void saveAndNavigate("/system-prompts#characterSheetUpdatePrompt")
            }
          />

          <Stack gap="sm">
            <Group justify="space-between">
              <div>
                <Text fw={600}>Characters</Text>
                <Text size="sm" c="dimmed">
                  Only approved, active Character Sheets are included in story
                  context. Appearance remains exclusive to image generation.
                </Text>
              </div>
              <Button
                variant="subtle"
                leftSection={<RiAddLine />}
                style={{ color: Theme.character.primary }}
                onClick={addCharacter}
              >
                Add Character
              </Button>
            </Group>

            {formCharacters.length === 0 && (
              <Text size="sm" c="dimmed">
                No characters yet. Add one or prepare automatic character
                updates from story context.
              </Text>
            )}

            {formCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                isGenerating={generatingCharacterIds.has(character.id)}
                generationStatus={generationStatuses[character.id]}
                hasPendingProposal={proposal !== undefined}
                onNameChange={(name) => updateCharacter(character.id, { name })}
                onAppearanceChange={(appearance) =>
                  updateCharacter(character.id, { appearance })
                }
                onSheetItemsChange={(sheetItems) =>
                  updateCharacter(character.id, {
                    sheetItems,
                    sheetSource: "manual",
                  })
                }
                onAddSheetItem={() => addSheetItem(character.id)}
                onActivityOverrideChange={(activeOverride) =>
                  updateCharacter(character.id, { activeOverride })
                }
                onUseAutomaticActivity={() =>
                  updateCharacter(character.id, {
                    activeOverride: undefined,
                  })
                }
                onGenerateOrUpdate={() => void generateOrUpdate(character.id)}
                onPreferredImageChange={() =>
                  setModelPickerCharacterId(character.id)
                }
                onDelete={() => setCharacterToDeleteId(character.id)}
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      <ConfirmModal
        isOpen={characterToDeleteId !== undefined}
        onCancel={() => setCharacterToDeleteId(undefined)}
        onConfirm={removeCharacter}
        title="Confirm Deletion"
        message="Are you sure you want to delete this character?"
      />

      {modelPickerCharacterId && (
        <CharacterImageModelModal
          opened
          chatId={chatId}
          currentSelection={
            formCharacters.find(
              (character) => character.id === modelPickerCharacterId,
            )?.preferredImage
          }
          onClose={() => setModelPickerCharacterId(undefined)}
          onSelect={(selection) => {
            void selectPreferredImage(modelPickerCharacterId, selection);
            setModelPickerCharacterId(undefined);
          }}
        />
      )}
    </Page>
  );
};

const CharactersHeader: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <>
    <Group mb="md">
      <ActionIcon onClick={onBack} variant="subtle" size="lg">
        <RiArrowLeftLine color={Theme.page.text} />
      </ActionIcon>
      <FaUser size={20} color={Theme.character.primary} />
      <Title order={2} fw={400} style={{ color: Theme.character.primary }}>
        Characters
      </Title>
    </Group>
    <Divider mb="xl" style={{ borderColor: Theme.character.border }} />
  </>
);

const toGenerationStatus = (result: CharacterMaintenanceResult): string => {
  if (result.status === "proposal-created") {
    return "Update ready. Return to chat to review and approve it.";
  }
  if (result.status === "unchanged") {
    return "The model proposed no changes.";
  }
  if (result.reason === "pending-approval") {
    return "Review or discard the pending character proposal first.";
  }
  return "The Character Sheet update could not be prepared.";
};
