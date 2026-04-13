import {
  Modal,
  Stack,
  Text,
  Textarea,
  Button,
  Group,
  NumberInput,
  Switch,
} from "@mantine/core";

interface CreateNoteModalProps {
  opened: boolean;
  content: string;
  hasExpiration: boolean;
  expiresAfterMessages: number;
  onContentChange: (content: string) => void;
  onHasExpirationChange: (hasExpiration: boolean) => void;
  onExpiresAfterMessagesChange: (value: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  opened,
  content,
  hasExpiration,
  expiresAfterMessages,
  onContentChange,
  onHasExpirationChange,
  onExpiresAfterMessagesChange,
  onSubmit,
  onCancel,
}) => {
  const canSubmit = content.trim().length > 0;

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title="Add Note"
      size="lg"
    >
      <Stack>
        <Text size="sm" c="dimmed">
          Add a note to relay persistent feedback to the LLM. Notes appear
          inline with messages and can expire after a set number of messages.
        </Text>

        <Textarea
          label="Note Content"
          placeholder="Enter your note for the LLM..."
          value={content}
          onChange={(e) => onContentChange(e.currentTarget.value)}
          minRows={4}
          autosize
          autoFocus
          required
        />

        <Switch
          label="Expires after a set number of messages"
          checked={hasExpiration}
          onChange={(e) => onHasExpirationChange(e.currentTarget.checked)}
        />

        {hasExpiration && (
          <NumberInput
            label="Expires after (messages)"
            description="Number of messages after which this note will no longer be sent to the LLM"
            value={expiresAfterMessages}
            onChange={(val) =>
              onExpiresAfterMessagesChange(typeof val === "number" ? val : 10)
            }
            min={1}
            max={1000}
          />
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button color="blue" onClick={onSubmit} disabled={!canSubmit}>
            Add Note
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
