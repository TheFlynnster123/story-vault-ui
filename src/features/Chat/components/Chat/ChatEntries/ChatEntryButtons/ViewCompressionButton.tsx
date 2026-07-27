import { useState } from "react";
import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { RiContractLeftRightLine } from "react-icons/ri";
import { d } from "../../../../../../services/Dependencies";

interface ViewCompressionButtonProps {
  chatId: string;
  messageId: string;
}

export const ViewCompressionButton: React.FC<
  ViewCompressionButtonProps
> = ({ chatId, messageId }) => {
  const [opened, setOpened] = useState(false);
  const [originalContent, setOriginalContent] = useState("");
  const [compressedContent, setCompressedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const openCompression = () => {
    const message = d.UserChatProjection(chatId).GetMessage(messageId);
    if (!message?.compression) return;

    setOriginalContent(message.content ?? "");
    setCompressedContent(message.compression.content);
    setOpened(true);
  };

  const saveCompression = async () => {
    const normalizedContent = compressedContent.trim();
    if (!normalizedContent) return;

    setIsSaving(true);
    try {
      await d
        .ChatService(chatId)
        .EditMessageCompression(messageId, normalizedContent);
      setOpened(false);
    } catch (error) {
      d.ErrorService().log("Failed to edit message compression", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        size="xs"
        variant="light"
        color="teal"
        leftSection={<RiContractLeftRightLine size={14} />}
        onClick={openCompression}
      >
        View compression
      </Button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Message compression"
        size="xl"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            The complete original remains visible in chat. The editable
            compression below is the representation used for older LLM
            context.
          </Text>
          <Textarea
            label="Original message"
            value={originalContent}
            readOnly
            autosize
            minRows={5}
            maxRows={12}
          />
          <Textarea
            label="Model-facing compression"
            value={compressedContent}
            onChange={(event) =>
              setCompressedContent(event.currentTarget.value)
            }
            autosize
            minRows={4}
            maxRows={10}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>
              Cancel
            </Button>
            <Button
              color="teal"
              loading={isSaving}
              disabled={!compressedContent.trim()}
              onClick={() => void saveCompression()}
            >
              Save compression
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
