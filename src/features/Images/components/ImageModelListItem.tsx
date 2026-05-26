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
  Tooltip,
} from "@mantine/core";
import { RiEditLine, RiLockLine, RiGitBranchLine } from "react-icons/ri";
import { ModelSampleImage } from "./ModelSampleImage";
import type { AnyImageModel } from "../services/modelGeneration/ImageModel";
import { isLegacyJobImageModel } from "../services/modelGeneration/ImageModel";

interface ImageModelListItemProps {
  model: AnyImageModel;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onMigrate?: () => void;
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
  onMigrate,
}) => {
  const isLegacy = isLegacyJobImageModel(model);
  const input = isLegacy ? undefined : model.input;

  return (
    <Paper withBorder p="md" mb="md" w="100%">
      <Group wrap="nowrap" align="flex-start" gap="md" w="100%">
        {/* Left: Image */}
        <Box>
          <ModelSampleImage
            sampleImageJobId={model.sampleWorkflowId}
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
            {isLegacy ? (
              <Badge color="yellow" variant="light" size="sm">
                Legacy image model
              </Badge>
            ) : (
              <Badge color="teal" variant="light" size="sm">
                Workflow
              </Badge>
            )}
          </Group>

          {isLegacy && (
            <Text size="xs" c="yellow.8" lineClamp={2}>
              This model is locked until it is migrated to workflow format.
            </Text>
          )}

          {input?.prompt && (
            <Text size="xs" c="dimmed" lineClamp={2}>
              <strong>Prompt:</strong> {truncateText(input.prompt)}
            </Text>
          )}

          {input?.negativePrompt && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              <strong>Negative:</strong> {truncateText(input.negativePrompt)}
            </Text>
          )}
        </Stack>

        {/* Right: Actions */}
        <Stack gap="xs" style={{ flexShrink: 0 }}>
          <Tooltip
            disabled={!isLegacy}
            label="Migrate to workflow before selecting this model"
          >
            <Button
              size="sm"
              variant="light"
              onClick={onSelect}
              disabled={isLegacy}
              fullWidth
            >
              Select
            </Button>
          </Tooltip>
          {isLegacy && onMigrate && (
            <Button
              size="sm"
              variant="filled"
              color="yellow"
              leftSection={<RiGitBranchLine />}
              onClick={onMigrate}
              fullWidth
            >
              Migrate to workflow
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            leftSection={isLegacy ? <RiLockLine /> : <RiEditLine />}
            onClick={onEdit}
            fullWidth
          >
            {isLegacy ? "View locked" : "Edit"}
          </Button>
        </Stack>
      </Group>
    </Paper>
  );
};
