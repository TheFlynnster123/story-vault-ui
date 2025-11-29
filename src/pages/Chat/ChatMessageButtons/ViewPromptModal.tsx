import { Modal, Stack, Text, Button, Group, Code } from "@mantine/core";

interface ViewPromptModalProps {
  opened: boolean;
  prompt: string;
  onClose: () => void;
}

export const ViewPromptModal: React.FC<ViewPromptModalProps> = ({
  opened,
  prompt,
  onClose,
}) => {
  return (
    <Modal opened={opened} onClose={onClose} title="Image Prompt" size="lg">
      <Stack>
        <Text size="sm" c="dimmed">
          The prompt used to generate this image:
        </Text>
        <Code block style={{ whiteSpace: "pre-wrap" }}>
          {prompt}
        </Code>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
