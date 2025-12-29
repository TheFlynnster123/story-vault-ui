import React from "react";
import { Box, Text } from "@mantine/core";

const CONTENT_PREVIEW_LENGTH = 100;

const truncateContent = (content: string, maxLength: number): string => {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + "...";
};

interface PreviewItemProps {
  name?: string;
  description?: string;
  content?: string;
  isExpanded?: boolean;
}

export const PreviewItem: React.FC<PreviewItemProps> = ({
  name,
  description,
  content,
  isExpanded,
}) => (
  <Box
    mb="xs"
    pl="sm"
    style={{
      borderLeft: "2px solid rgba(255, 255, 255, 0.3)",
    }}
  >
    {name && (
      <Text size="xs" fw={600} c="dimmed">
        {name}
      </Text>
    )}
    {description && (
      <Box mt={name ? 2 : 0}>
        <Text size="xs" c="dimmed" fs="italic">
          Prompt:{" "}
          {isExpanded
            ? description
            : truncateContent(description, CONTENT_PREVIEW_LENGTH)}
        </Text>
      </Box>
    )}
    {content && (
      <Box mt={name || description ? 4 : 0}>
        <Text size="xs" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
          {isExpanded
            ? content
            : truncateContent(content, CONTENT_PREVIEW_LENGTH)}
        </Text>
      </Box>
    )}
  </Box>
);
