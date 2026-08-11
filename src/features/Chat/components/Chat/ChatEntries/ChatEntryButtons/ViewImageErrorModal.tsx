import { Box, Button, Group, Modal, Stack, Text } from "@mantine/core";

interface ViewImageErrorModalProps {
  opened: boolean;
  error: string;
  onClose: () => void;
}

export const ViewImageErrorModal = ({
  opened,
  error,
  onClose,
}: ViewImageErrorModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title="Image Generation Error"
    size="lg"
  >
    <Stack>
      <Text size="sm" c="dimmed">
        The image could not be generated.
      </Text>
      <Box
        component="pre"
        style={{
          backgroundColor: "var(--mantine-color-dark-6)",
          borderRadius: 6,
          color: "var(--mantine-color-red-3)",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "0.8125rem",
          lineHeight: 1.55,
          margin: 0,
          overflowWrap: "anywhere",
          padding: "12px",
          whiteSpace: "pre-wrap",
        }}
      >
        {error}
      </Box>
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Stack>
  </Modal>
);
