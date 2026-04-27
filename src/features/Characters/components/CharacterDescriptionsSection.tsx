import React, { useState } from "react";
import { Box, Group, Text } from "@mantine/core";
import { FaUser } from "react-icons/fa";
import { Theme } from "../../../components/Theme";
import type { CharacterDescription } from "../services/CharacterDescription";
import { useCharacterDescriptions } from "../hooks/useCharacterDescriptions";
import { FlowButton } from "../../Chat/components/Chat/Flow/FlowButton";
import { ContentPreview } from "../../Chat/components/Chat/Flow/ContentPreview";
import { PreviewItem } from "../../Chat/components/Chat/Flow/PreviewItem";

interface CharacterDescriptionsSectionProps {
  chatId: string;
  onNavigate: () => void;
}

export const CharacterDescriptionsSection: React.FC<
  CharacterDescriptionsSectionProps
> = ({ chatId, onNavigate }) => {
  const { characters } = useCharacterDescriptions(chatId);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Box>
      <FlowButton
        onClick={onNavigate}
        leftSection={<FaUser size={16} color={Theme.character.primary} />}
      >
        <Group gap="xs">
          <Text size="sm" fw={500}>
            Character Descriptions
          </Text>
          <Text size="xs" c="dimmed">
            ({characters.length})
          </Text>
        </Group>
      </FlowButton>

      <ContentPreview
        items={characters}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        renderItem={(character) =>
          renderCharacterPreview(character, isExpanded)
        }
        emptyMessage="No character descriptions saved"
      />
    </Box>
  );
};

const renderCharacterPreview = (
  character: CharacterDescription,
  isExpanded: boolean,
) => (
  <PreviewItem
    key={character.id}
    name={character.name || "Unnamed character"}
    content={toPreviewContent(character)}
    isExpanded={isExpanded}
  />
);

const toPreviewContent = (character: CharacterDescription): string => {
  if (character.description.trim().length > 0) {
    return character.description;
  }

  return "No character description was generated.";
};
