import { Modal, Stack, Text, Textarea, Button, Group } from "@mantine/core";

interface SendGuidanceModalProps {
  opened: boolean;
  guidance: string;
  onGuidanceChange: (guidance: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const SendGuidanceModal: React.FC<SendGuidanceModalProps> = ({
  opened,
  guidance,
  onGuidanceChange,
  onSubmit,
  onCancel,
}) => {
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title="Send with Guidance"
      size="xl"
      style={{ height: "100%" }}
    >
      <Stack>
        <Text size="sm" c="dimmed">
          Provide guidance for the AI's next response. This guidance will not be
          stored in the chat history.
        </Text>

        <Textarea
          placeholder="Enter your guidance here..."
          value={guidance}
          onChange={(e) => onGuidanceChange(e.currentTarget.value)}
          minRows={12}
          autosize
          autoFocus
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button color="orange" onClick={onSubmit}>
            Send
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
