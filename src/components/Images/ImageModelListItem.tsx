import React from "react";
import {
  Group,
  Title,
  Paper,
  Badge,
  Button,
  Text,
  Box,
  Stack,
} from "@mantine/core";
import { RiEditLine } from "react-icons/ri";
import { ModelSampleImage } from "./ModelSampleImage";
import type { ImageModel } from "../../services/Image/modelGeneration/ImageModel";

interface ImageModelListItemProps {
  model: ImageModel;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export const ImageModelListItem: React.FC<ImageModelListItemProps> = ({
  model,
  isSelected,
  onSelect,
  onEdit,
}) => {
  return (
    <Paper withBorder p="md" mb="md" w="100%">
      <Group wrap="nowrap" align="flex-start" gap="md" w="100%">
        {/* Left: Image */}
        <Box>
          <ModelSampleImage
            sampleImageJobId={model.sampleImageId}
            size="medium"
          />
        </Box>

        {/* Center: Model info */}
        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs">
            <Title order={4}>{model.name}</Title>
            {isSelected && (
              <Badge color="blue" variant="filled" size="sm">
                Selected
              </Badge>
            )}
          </Group>

          {model.input.params.prompt && (
            <Text size="xs" c="dimmed" lineClamp={2}>
              <strong>Prompt:</strong> {truncateText(model.input.params.prompt)}
            </Text>
          )}

          {model.input.params.negativePrompt && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              <strong>Negative:</strong>{" "}
              {truncateText(model.input.params.negativePrompt)}
            </Text>
          )}
        </Stack>

        {/* Right: Actions */}
        <Stack gap="xs" style={{ flexShrink: 0 }}>
          <Button size="sm" variant="light" onClick={onSelect} fullWidth>
            Select
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftSection={<RiEditLine />}
            onClick={onEdit}
            fullWidth
          >
            Edit
          </Button>
        </Stack>
      </Group>
    </Paper>
  );
};
