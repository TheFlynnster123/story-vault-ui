import { Modal, Stack, Text, Button, Group, Code } from "@mantine/core";

interface ViewPromptModalProps {
  opened: boolean;
  prompt: string;
  characterDescription?: string;
  onClose: () => void;
}

export const ViewPromptModal: React.FC<ViewPromptModalProps> = ({
  opened,
  prompt,
  characterDescription,
  onClose,
}) => {
  return (
    <Modal opened={opened} onClose={onClose} title="Image Prompt" size="lg">
      <Stack>
        {characterDescription && (
          <>
            <Text size="sm" c="dimmed">
              Character description used:
            </Text>
            <Code block style={{ whiteSpace: "pre-wrap" }}>
              {characterDescription}
            </Code>
          </>
        )}
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
