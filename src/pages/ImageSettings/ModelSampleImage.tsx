import React from "react";
import { Image, Text, Box, Loader, Group } from "@mantine/core";
import { useCivitJob } from "../../hooks/useCivitJob";

export const GLOBAL_IMAGE_CHAT_ID = "SAMPLE_IMAGE_GENERATOR";

interface ModelSampleImageProps {
  sampleImageJobId?: string;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
}

const getSizeStyles = (size: "small" | "medium" | "large") => {
  switch (size) {
    case "small":
      return { maxHeight: "60px", maxWidth: "60px" };
    case "medium":
      return { maxHeight: "120px", maxWidth: "120px" };
    case "large":
      return { maxHeight: "300px", maxWidth: "100%" };
    default:
      return { maxHeight: "120px", maxWidth: "120px" };
  }
};

export const ModelSampleImage: React.FC<ModelSampleImageProps> = ({
  sampleImageJobId,
  size = "medium",
  showLabel = false,
}) => {
  const { photoBase64, isLoading } = useCivitJob(
    GLOBAL_IMAGE_CHAT_ID,
    sampleImageJobId || ""
  );
  const sizeStyles = getSizeStyles(size);

  if (!sampleImageJobId) {
    return null;
  }

  if (isLoading) {
    return (
      <Group gap="xs">
        <Loader size="sm" />
        {showLabel && (
          <Text size="sm" c="dimmed">
            Loading sample...
          </Text>
        )}
      </Group>
    );
  }

  if (!photoBase64) {
    return showLabel ? (
      <Text size="sm" c="dimmed">
        No sample available
      </Text>
    ) : null;
  }

  return (
    <Box>
      {showLabel && (
        <Text size="sm" fw={500} mb="xs">
          Sample Image:
        </Text>
      )}
      <Image
        src={photoBase64}
        alt="Sample image for model"
        radius="md"
        fit="contain"
        style={sizeStyles}
      />
    </Box>
  );
};
