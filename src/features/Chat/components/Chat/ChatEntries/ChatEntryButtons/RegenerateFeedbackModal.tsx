import { Modal, Stack, Text, Textarea, Button, Group } from "@mantine/core";

interface RegenerateFeedbackModalProps {
  opened: boolean;
  feedback: string;
  onFeedbackChange: (feedback: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const RegenerateFeedbackModal: React.FC<
  RegenerateFeedbackModalProps
> = ({ opened, feedback, onFeedbackChange, onSubmit, onCancel }) => {
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title="Regenerate with Feedback"
      size="xl"
      style={{ height: "100%" }}
    >
      <Stack>
        <Text size="sm" c="dimmed">
          Automatically regenerate this response with your feedback.
        </Text>

        <Textarea
          placeholder="Enter your feedback here..."
          value={feedback}
          onChange={(e) => onFeedbackChange(e.currentTarget.value)}
          minRows={12}
          autosize
          autoFocus
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button color="blue" onClick={onSubmit}>
            Regenerate
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
