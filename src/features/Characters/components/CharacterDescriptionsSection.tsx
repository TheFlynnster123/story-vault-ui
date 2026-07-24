import { Group, Text } from "@mantine/core";
import { FaUser } from "react-icons/fa";
import { Theme } from "../../../components/Theme";
import { FlowButton } from "../../Chat/components/Chat/Flow/FlowButton";
import { useCharacterDescriptions } from "../hooks/useCharacterDescriptions";
import {
  isCharacterActive,
  isCharacterTracked,
} from "../services/CharacterDescription";

interface CharacterDescriptionsSectionProps {
  chatId: string;
  onNavigate: () => void;
}

export const CharacterDescriptionsSection: React.FC<
  CharacterDescriptionsSectionProps
> = ({ chatId, onNavigate }) => {
  const { characters } = useCharacterDescriptions(chatId);
  const activeCount = characters.filter(
    (character) =>
      isCharacterTracked(character) && isCharacterActive(character),
  ).length;

  return (
    <FlowButton
      onClick={onNavigate}
      leftSection={<FaUser size={16} color={Theme.character.primary} />}
    >
      <Group gap="xs">
        <Text size="sm" fw={500}>
          Characters
        </Text>
        <Text size="xs" c="dimmed">
          {activeCount} active / {characters.length} total
        </Text>
      </Group>
    </FlowButton>
  );
};
