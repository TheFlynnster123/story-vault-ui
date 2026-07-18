import {
  Badge,
  Button,
  Divider,
  Group,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { RiDeleteBinLine, RiImageLine } from "react-icons/ri";
import { GenerateButton } from "../../AI/components/GenerateButton";
import { Theme } from "../../../components/Theme";
import type {
  CharacterDescription,
  PreferredImage,
} from "../services/CharacterDescription";
import { isCharacterActive } from "../services/CharacterDescription";
import { CharacterSheetItemsEditor } from "./CharacterSheetItemsEditor";

interface CharacterCardProps {
  character: CharacterDescription;
  isGenerating: boolean;
  generationStatus: string | undefined;
  hasPendingProposal: boolean;
  onNameChange: (name: string) => void;
  onAppearanceChange: (appearance: string) => void;
  onSheetItemsChange: (items: string[]) => void;
  onAddSheetItem: () => void;
  onActivityOverrideChange: (active: boolean) => void;
  onUseAutomaticActivity: () => void;
  onGenerateOrUpdate: () => void;
  onPreferredImageChange: () => void;
  onDelete: () => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  isGenerating,
  generationStatus,
  hasPendingProposal,
  onNameChange,
  onAppearanceChange,
  onSheetItemsChange,
  onAddSheetItem,
  onActivityOverrideChange,
  onUseAutomaticActivity,
  onGenerateOrUpdate,
  onPreferredImageChange,
  onDelete,
}) => {
  const active = isCharacterActive(character);
  const hasSheet = character.sheetItems.some((item) => item.trim());
  const hasBlankSheetItem = character.sheetItems.some((item) => !item.trim());

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <TextInput
          label="Character Name"
          placeholder="e.g., Sarah Chen"
          value={character.name}
          style={{ flex: 1 }}
          onChange={(event) => onNameChange(event.currentTarget.value)}
          styles={characterInputStyles}
        />
        <Stack gap={2} align="flex-end">
          <Switch
            label="Active"
            checked={active}
            onChange={(event) =>
              onActivityOverrideChange(event.currentTarget.checked)
            }
          />
          {character.activeOverride !== undefined ? (
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={onUseAutomaticActivity}
            >
              Use automatic activity
            </Button>
          ) : (
            <Text size="xs" c="dimmed">
              Automatically detected
            </Text>
          )}
        </Stack>
      </Group>

      <Group gap="xs">
        <Badge color={active ? "green" : "gray"} variant="light">
          {active ? "Active" : "Inactive"}
        </Badge>
        {character.activeOverride !== undefined && (
          <Badge color="indigo" variant="light">
            User override
          </Badge>
        )}
        {character.sheetSource && (
          <Badge color="gray" variant="outline">
            Sheet last updated{" "}
            {character.sheetSource === "auto" ? "by AI" : "manually"}
          </Badge>
        )}
      </Group>

      <CharacterSheetItemsEditor
        items={character.sheetItems}
        onAdd={onAddSheetItem}
        onChange={onSheetItemsChange}
      />

      <Group align="center">
        <GenerateButton
          size="xs"
          loading={isGenerating}
          disabled={
            hasPendingProposal ||
            !character.name.trim() ||
            hasBlankSheetItem ||
            isGenerating
          }
          onClick={onGenerateOrUpdate}
        >
          {hasSheet ? "Update sheet" : "Generate sheet"}
        </GenerateButton>
        {hasPendingProposal && (
          <Text size="xs" c="dimmed">
            Review the pending character proposal from the chat control first.
          </Text>
        )}
        {generationStatus && (
          <Text size="xs" c="dimmed">
            {generationStatus}
          </Text>
        )}
      </Group>

      <Textarea
        label="Character Appearance"
        description="Stable physical traits used for image generation. Exclude actions, poses, scenes, and temporary clothing."
        placeholder="Face shape, eye color, hair, age, build, distinctive features..."
        value={character.appearance}
        minRows={3}
        autosize
        onChange={(event) => onAppearanceChange(event.currentTarget.value)}
        styles={characterInputStyles}
      />

      <PreferredImageControl
        preferredImage={character.preferredImage}
        onChange={onPreferredImageChange}
      />

      <Button
        variant="outline"
        color="red"
        leftSection={<RiDeleteBinLine />}
        style={{ alignSelf: "flex-start" }}
        onClick={onDelete}
      >
        Delete Character
      </Button>

      <Divider my="sm" style={{ borderColor: Theme.character.border }} />
    </Stack>
  );
};

const PreferredImageControl: React.FC<{
  preferredImage: PreferredImage | undefined;
  onChange: () => void;
}> = ({ preferredImage, onChange }) => (
  <Group gap="xs" align="center">
    <Text size="sm">Preferred Image Model:</Text>
    {preferredImage ? (
      <Badge
        size="sm"
        color={preferredImage.source === "variant" ? "violet" : "teal"}
        variant="light"
      >
        {preferredImage.source}
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
      onClick={onChange}
    >
      Change
    </Button>
  </Group>
);

const characterInputStyles = {
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderColor: Theme.character.border,
    color: Theme.page.text,
  },
  label: {
    color: Theme.page.text,
  },
};
