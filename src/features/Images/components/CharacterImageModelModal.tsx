import React, { useState, useMemo } from "react";
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  TextInput,
  Badge,
  ScrollArea,
  Divider,
} from "@mantine/core";
import { RiSearchLine, RiCheckLine } from "react-icons/ri";
import type { PreferredImage } from "../../Characters/services/CharacterDescription";
import { useChatImageVariants } from "../hooks/useChatImageVariants";
import { useImageModels } from "../hooks/useImageModels";
import { Theme } from "../../../components/Theme";

export interface CharacterImageModelModalProps {
  opened: boolean;
  onClose: () => void;
  chatId: string;
  currentSelection?: PreferredImage;
  onSelect: (selection: PreferredImage | undefined) => void;
}

export const CharacterImageModelModal: React.FC<
  CharacterImageModelModalProps
> = ({ opened, onClose, chatId, currentSelection, onSelect }) => {
  const [search, setSearch] = useState("");
  const { chatImageVariants } = useChatImageVariants(chatId);
  const { userImageModels } = useImageModels();

  const query = search.toLowerCase();

  const filteredVariants = useMemo(
    () =>
      chatImageVariants.variants.filter((v) =>
        v.name.toLowerCase().includes(query),
      ),
    [chatImageVariants.variants, query],
  );

  const filteredModels = useMemo(
    () =>
      userImageModels.models.filter((m) =>
        m.name.toLowerCase().includes(query),
      ),
    [userImageModels.models, query],
  );

  const handleSelect = (selection: PreferredImage | undefined) => {
    onSelect(selection);
    onClose();
  };

  const isCurrentVariant = (id: string) =>
    currentSelection?.source === "variant" && currentSelection.id === id;

  const isCurrentSystem = (id: string) =>
    currentSelection?.source === "system" && currentSelection.id === id;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Preferred Image Model"
      size="md"
    >
      <Stack>
        <TextInput
          placeholder="Search models..."
          leftSection={<RiSearchLine size={14} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          styles={{
            input: {
              backgroundColor: "rgba(0,0,0,0.3)",
              color: Theme.page.text,
            },
          }}
        />

        <ScrollArea h={420}>
          <Stack gap="xs">
            {/* No preference option */}
            <ModelRow
              label="No preference"
              sublabel="Use the chat-level selection"
              isSelected={!currentSelection}
              onClick={() => handleSelect(undefined)}
            />

            {/* Variants section */}
            {filteredVariants.length > 0 && (
              <>
                <Divider
                  label={
                    <Text size="xs" c="dimmed">
                      Chat Variants
                    </Text>
                  }
                  labelPosition="left"
                />
                {filteredVariants.map((variant) => (
                  <ModelRow
                    key={variant.id}
                    label={variant.name}
                    badge="variant"
                    badgeColor="violet"
                    isSelected={isCurrentVariant(variant.id)}
                    onClick={() =>
                      handleSelect({ id: variant.id, source: "variant" })
                    }
                  />
                ))}
              </>
            )}

            {/* System models section */}
            {filteredModels.length > 0 && (
              <>
                <Divider
                  label={
                    <Text size="xs" c="dimmed">
                      System Models
                    </Text>
                  }
                  labelPosition="left"
                />
                {filteredModels.map((model) => (
                  <ModelRow
                    key={model.id}
                    label={model.name}
                    badge="system"
                    badgeColor="teal"
                    isSelected={isCurrentSystem(model.id)}
                    onClick={() =>
                      handleSelect({ id: model.id, source: "system" })
                    }
                  />
                ))}
              </>
            )}

            {filteredVariants.length === 0 &&
              filteredModels.length === 0 &&
              search && (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  No models match &quot;{search}&quot;
                </Text>
              )}
          </Stack>
        </ScrollArea>

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

interface ModelRowProps {
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  isSelected: boolean;
  onClick: () => void;
}

const ModelRow: React.FC<ModelRowProps> = ({
  label,
  sublabel,
  badge,
  badgeColor,
  isSelected,
  onClick,
}) => (
  <Button
    variant={isSelected ? "light" : "subtle"}
    color={isSelected ? "lime" : "gray"}
    fullWidth
    justify="space-between"
    rightSection={isSelected ? <RiCheckLine size={14} /> : null}
    onClick={onClick}
    styles={{
      root: { height: "auto", padding: "8px 12px" },
      inner: { justifyContent: "space-between", width: "100%" },
    }}
  >
    <Group gap="xs" wrap="nowrap">
      {badge && (
        <Badge size="xs" color={badgeColor} variant="light">
          {badge}
        </Badge>
      )}
      <Stack gap={0}>
        <Text size="sm" fw={isSelected ? 600 : 400}>
          {label}
        </Text>
        {sublabel && (
          <Text size="xs" c="dimmed">
            {sublabel}
          </Text>
        )}
      </Stack>
    </Group>
  </Button>
);
