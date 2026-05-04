import React, { useState } from "react";
import { Box, Text, Stack, Divider, Modal, Button, Group } from "@mantine/core";
import { LuBrain } from "react-icons/lu";
import { RiStickyNoteLine } from "react-icons/ri";
import { Theme } from "../../../../../components/Theme";
import { FlowButton } from "./FlowButton";
import { CreateNoteModal } from "../ChatControls/CreateNoteModal";
import { useAddNote } from "../ChatControls/useAddNote";
import { useMemories } from "../../../../Memories/hooks/useMemories";

interface NotesAndMemoriesSectionProps {
  chatId: string;
  onNavigateToMemories: () => void;
}

export const NotesAndMemoriesSection: React.FC<
  NotesAndMemoriesSectionProps
> = ({ chatId, onNavigateToMemories }) => {
  const [showPicker, setShowPicker] = useState(false);

  const {
    showModal: showNoteModal,
    content,
    hasExpiration,
    expiresAfterMessages,
    setContent,
    setHasExpiration,
    setExpiresAfterMessages,
    handleOpenModal: openNoteModal,
    handleCloseModal,
    handleSubmit,
  } = useAddNote({ chatId });

  const { memories } = useMemories(chatId);

  const handleAddNote = () => {
    setShowPicker(false);
    openNoteModal();
  };

  const handlePinMemory = () => {
    setShowPicker(false);
    onNavigateToMemories();
  };

  return (
    <Box>
      <FlowButton
        onClick={() => setShowPicker(true)}
        leftSection={<RiStickyNoteLine size={18} color={Theme.note.primary} />}
      >
        <Group gap="xs">
          <Text size="sm" fw={500}>
            Notes / Memories
          </Text>
          {memories.length > 0 && (
            <Text size="xs" c="dimmed">
              ({memories.length} pinned)
            </Text>
          )}
        </Group>
      </FlowButton>

      <Modal
        opened={showPicker}
        onClose={() => setShowPicker(false)}
        title="Notes & Memories"
        size="sm"
      >
        <Stack gap="lg">
          <Stack gap="xs">
            <Group gap="xs">
              <RiStickyNoteLine size={18} color={Theme.note.primary} />
              <Text size="sm" fw={600}>
                Add Note to Chat History
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              Inject a one-off message into the conversation. The AI reads it
              inline with the chat history. Notes can expire after a set number
              of messages.
            </Text>
            <Button
              variant="light"
              color="orange"
              fullWidth
              onClick={handleAddNote}
            >
              Add Note
            </Button>
          </Stack>

          <Divider label="or" labelPosition="center" />

          <Stack gap="xs">
            <Group gap="xs">
              <LuBrain size={18} color={Theme.memories.primary} />
              <Text size="sm" fw={600}>
                Pin a Memory
              </Text>
              {memories.length > 0 && (
                <Text size="xs" c="dimmed">
                  ({memories.length} saved)
                </Text>
              )}
            </Group>
            <Text size="xs" c="dimmed">
              Memories are persistent context always included at the start of
              every AI request — great for character traits, world rules, or
              anything the AI should never forget.
            </Text>
            <Button
              variant="light"
              color="pink"
              fullWidth
              onClick={handlePinMemory}
            >
              Manage Memories
            </Button>
          </Stack>
        </Stack>
      </Modal>

      <CreateNoteModal
        opened={showNoteModal}
        content={content}
        hasExpiration={hasExpiration}
        expiresAfterMessages={expiresAfterMessages}
        onContentChange={setContent}
        onHasExpirationChange={setHasExpiration}
        onExpiresAfterMessagesChange={setExpiresAfterMessages}
        onSubmit={handleSubmit}
        onCancel={handleCloseModal}
      />
    </Box>
  );
};
