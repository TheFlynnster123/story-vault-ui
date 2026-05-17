import { Modal, Stack, Text, Button, Group, Code } from "@mantine/core";

interface ViewPromptModalProps {
  opened: boolean;
  prompt: string;
  characterDescription?: string;
  basePrompt?: string;
  sceneDescription?: string;
  onClose: () => void;
}

export const ViewPromptModal: React.FC<ViewPromptModalProps> = ({
  opened,
  prompt,
  characterDescription,
  basePrompt,
  sceneDescription,
  onClose,
}) => {
  const hasBreakdown = sceneDescription !== undefined;

  return (
    <Modal opened={opened} onClose={onClose} title="Image Prompt" size="lg">
      <Stack>
        {hasBreakdown ? (
          <>
            {basePrompt && (
              <>
                <Text size="sm" c="dimmed">
                  Base prompt:
                </Text>
                <Code block style={{ whiteSpace: "pre-wrap" }}>
                  {basePrompt}
                </Code>
              </>
            )}
            {characterDescription && (
              <>
                <Text size="sm" c="dimmed">
                  Character description:
                </Text>
                <Code block style={{ whiteSpace: "pre-wrap" }}>
                  {characterDescription}
                </Code>
              </>
            )}
            {sceneDescription && (
              <>
                <Text size="sm" c="dimmed">
                  What the character is doing:
                </Text>
                <Code block style={{ whiteSpace: "pre-wrap" }}>
                  {sceneDescription}
                </Code>
              </>
            )}
            <Text size="sm" c="dimmed">
              Full prompt sent to image generator:
            </Text>
            <Code block style={{ whiteSpace: "pre-wrap" }}>
              {prompt}
            </Code>
          </>
        ) : (
          <>
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
          </>
        )}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
