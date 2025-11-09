import React from "react";
import {
  Accordion,
  Text,
  Stack,
  Badge,
  Group,
  Box,
  ScrollArea,
  Textarea,
} from "@mantine/core";
import { usePlanningNotesCache } from "../../hooks/usePlanningNotesCache";

interface NotesAccordionProps {
  chatId: string;
}

export const NotesAccordion: React.FC<NotesAccordionProps> = ({ chatId }) => {
  const {
    planningNotes: notes,
    isLoading,
    updateNoteContent,
  } = usePlanningNotesCache(chatId);

  return (
    <Box
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        position: "relative",
        zIndex: 10,
      }}
    >
      <Accordion
        variant="filled"
        styles={{
          root: {
            backgroundColor: "transparent",
          },
          control: {
            backgroundColor: "rgba(30, 30, 30, 0.95)",
            color: "#ffffff",
            padding: "12px 16px",
            "&:hover": {
              backgroundColor: "rgba(50, 50, 50, 0.95)",
            },
          },
          label: {
            fontSize: "14px",
            fontWeight: 600,
          },
          content: {
            backgroundColor: "rgba(20, 20, 20, 0.95)",
            padding: 0,
          },
          item: {
            border: "none",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          },
          chevron: {
            color: "#ffffff",
          },
        }}
      >
        <Accordion.Item value="notes">
          <Accordion.Control>
            Notes {notes.length > 0 && `(${notes.length})`}
          </Accordion.Control>
          <Accordion.Panel>
            <ScrollArea h={300} style={{ padding: "12px" }}>
              {isLoading ? (
                <Text c="dimmed" ta="center" py="xl" fs="italic">
                  Loading notes...
                </Text>
              ) : notes.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl" fs="italic">
                  No notes available
                </Text>
              ) : (
                <Stack gap="md">
                  {notes.map((note) => (
                    <Box
                      key={note.id}
                      p="md"
                      style={{
                        backgroundColor: "rgba(40, 40, 40, 0.8)",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <Group justify="space-between" mb="xs">
                        <Text fw={600} size="md" c="#ffffff">
                          {note.name}
                        </Text>
                        <Badge
                          size="sm"
                          variant="light"
                          color="blue"
                          tt="capitalize"
                        >
                          {note.type}
                        </Badge>
                      </Group>

                      {note.prompt && (
                        <Box mt="xs">
                          <Text
                            size="xs"
                            fw={600}
                            c="dimmed"
                            tt="uppercase"
                            mb={4}
                            style={{ letterSpacing: "0.5px" }}
                          >
                            Prompt:
                          </Text>
                          <Text
                            size="sm"
                            p="xs"
                            c="#e0e0e0"
                            style={{
                              backgroundColor: "rgba(0, 0, 0, 0.3)",
                              borderRadius: "4px",
                              whiteSpace: "pre-wrap",
                              wordWrap: "break-word",
                            }}
                          >
                            {note.prompt}
                          </Text>
                        </Box>
                      )}

                      <Box mt="xs">
                        <Text
                          size="xs"
                          fw={600}
                          c="dimmed"
                          tt="uppercase"
                          mb={4}
                          style={{ letterSpacing: "0.5px" }}
                        >
                          Content:
                        </Text>
                        <Textarea
                          value={note.content || ""}
                          onChange={(e) =>
                            updateNoteContent(note.id, e.currentTarget.value)
                          }
                          placeholder="Note content will appear here..."
                          autosize
                          minRows={3}
                          maxRows={10}
                          styles={{
                            input: {
                              backgroundColor: "rgba(0, 0, 0, 0.3)",
                              color: "#e0e0e0",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              "&:focus": {
                                borderColor: "rgba(13, 110, 253, 0.5)",
                              },
                            },
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </ScrollArea>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Box>
  );
};
