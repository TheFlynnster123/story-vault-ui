import React from "react";
import { Box, Text, Paper, Button } from "@mantine/core";
import { RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";

const PREVIEW_LIMIT = 2;

interface ContentPreviewProps<T> {
  items: T[];
  isExpanded: boolean;
  onToggle: () => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage: string;
}

export function ContentPreview<T>({
  items,
  isExpanded,
  onToggle,
  renderItem,
  emptyMessage,
}: ContentPreviewProps<T>) {
  if (items.length === 0) {
    return (
      <Text size="xs" c="dimmed" fs="italic" mt="xs">
        {emptyMessage}
      </Text>
    );
  }

  const displayItems = isExpanded ? items : items.slice(0, PREVIEW_LIMIT);

  return (
    <Box mt="xs">
      <Paper
        p="xs"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          borderRadius: "4px",
        }}
      >
        {displayItems.map((item, index) => renderItem(item, index))}

        <Button
          variant="subtle"
          size="xs"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          rightSection={
            isExpanded ? (
              <RiArrowUpSLine size={14} />
            ) : (
              <RiArrowDownSLine size={14} />
            )
          }
          styles={{
            root: {
              color: "#ffffff",
              padding: "2px 8px",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            },
          }}
        >
          {isExpanded ? "Collapse" : "Expand"}
        </Button>
      </Paper>
    </Box>
  );
}
