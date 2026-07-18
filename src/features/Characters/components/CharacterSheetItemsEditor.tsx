import {
  ActionIcon,
  Button,
  Group,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { RiAddLine, RiDeleteBinLine } from "react-icons/ri";
import { Theme } from "../../../components/Theme";
import { normalizeSheetItems } from "../services/CharacterDescription";

interface CharacterSheetItemsEditorProps {
  items: string[];
  onAdd: () => void;
  onChange: (items: string[]) => void;
}

export const CharacterSheetItemsEditor: React.FC<
  CharacterSheetItemsEditorProps
> = ({ items, onAdd, onChange }) => (
  <Stack gap="xs">
    <div>
      <Text size="sm" fw={500}>
        Character Sheet
      </Text>
      <Text size="xs" c="dimmed">
        Concise facts about personality, beliefs, motivations, relationships,
        voice, and boundaries—not actions or plot history.
      </Text>
    </div>

    {items.length === 0 && (
      <Text size="sm" c="dimmed" fs="italic">
        No Character Sheet facts yet.
      </Text>
    )}

    {items.map((item, index) => (
      <Group key={`${index}-${items.length}`} align="flex-start" wrap="nowrap">
        <Text mt={8}>•</Text>
        <Textarea
          aria-label={`Character Sheet fact ${index + 1}`}
          placeholder="Enter one durable identity fact..."
          value={item}
          autosize
          minRows={1}
          style={{ flex: 1 }}
          onChange={(event) =>
            onChange(replaceItem(items, index, event.currentTarget.value))
          }
          onBlur={() => onChange(normalizeSheetItems(items))}
          styles={{
            input: {
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderColor: Theme.character.border,
              color: Theme.page.text,
            },
          }}
        />
        <ActionIcon
          aria-label={`Delete Character Sheet fact ${index + 1}`}
          color="red"
          variant="subtle"
          mt={4}
          onClick={() => onChange(removeItem(items, index))}
        >
          <RiDeleteBinLine />
        </ActionIcon>
      </Group>
    ))}

    <Button
      variant="subtle"
      size="xs"
      leftSection={<RiAddLine />}
      disabled={items.some((item) => !item.trim())}
      style={{ alignSelf: "flex-start", color: Theme.character.primary }}
      onClick={onAdd}
    >
      Add fact
    </Button>
  </Stack>
);

const replaceItem = (items: string[], index: number, value: string): string[] =>
  items.map((item, itemIndex) => (itemIndex === index ? value : item));

const removeItem = (items: string[], index: number): string[] =>
  items.filter((_, itemIndex) => itemIndex !== index);
