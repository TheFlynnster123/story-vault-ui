import { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  Textarea,
  Button,
  Group,
  NumberInput,
  Switch,
  Text,
} from "@mantine/core";
import { d } from "../../../../../../services/Dependencies";
import type { NoteChatMessage } from "../../../../../../services/CQRS/UserChatProjection";

interface EditNoteModalProps {
  chatId: string;
  message: NoteChatMessage;
  opened: boolean;
  onClose: () => void;
}

export const EditNoteModal: React.FC<EditNoteModalProps> = ({
  chatId,
  message,
  opened,
  onClose,
}) => {
  const [content, setContent] = useState(message.content ?? "");
  const [hasExpiration, setHasExpiration] = useState(
    message.data.expiresAfterMessages !== null,
  );
  const [expiresAfterMessages, setExpiresAfterMessages] = useState<number>(
    message.data.expiresAfterMessages ?? 10,
  );

  useEffect(() => {
    if (opened) {
      setContent(message.content ?? "");
      setHasExpiration(message.data.expiresAfterMessages !== null);
      setExpiresAfterMessages(message.data.expiresAfterMessages ?? 10);
    }
  }, [opened, message]);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    await d
      .ChatService(chatId)
      .EditNote(
        message.id,
        content,
        hasExpiration ? expiresAfterMessages : null,
      );
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Note" size="lg">
      <Stack>
        <Text size="sm" c="dimmed">
          Edit your note content and expiration settings.
        </Text>

        <Textarea
          label="Note Content"
          placeholder="Enter note content..."
          value={content}
          onChange={(e) => setContent(e.currentTarget.value)}
          minRows={4}
          autosize
          autoFocus
          required
        />

        <Switch
          label="Expires after a set number of messages"
          checked={hasExpiration}
          onChange={(e) => setHasExpiration(e.currentTarget.checked)}
        />

        {hasExpiration && (
          <NumberInput
            label="Expires after (messages)"
            description="Number of messages after which this note expires"
            value={expiresAfterMessages}
            onChange={(val) =>
              setExpiresAfterMessages(typeof val === "number" ? val : 10)
            }
            min={1}
            max={1000}
          />
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="blue"
            onClick={handleSubmit}
            disabled={!content.trim()}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
