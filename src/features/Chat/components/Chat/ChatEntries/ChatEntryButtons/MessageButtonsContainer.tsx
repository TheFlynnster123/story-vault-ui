import { Stack } from "@mantine/core";
import { RegenerateButton } from "./RegenerateButton";
import { RegenerateWithFeedbackButton } from "./RegenerateWithFeedbackButton";
import { EditButton } from "./EditButton";
import { DeleteButton } from "./DeleteButton";
import { DeleteAllBelowButton } from "./DeleteAllBelowButton";

interface MessageButtonsContainerProps {
  chatId: string;
  messageId: string;
  isLastMessage: boolean;
  showRegenerate?: boolean;
  onRegenerate?: () => void;
}

export const MessageButtonsContainer: React.FC<
  MessageButtonsContainerProps
> = ({ chatId, messageId, isLastMessage, showRegenerate = false, onRegenerate }) => {
  return (
    <Stack gap="xs" justify="center">
      {showRegenerate && (
        <>
          <RegenerateButton chatId={chatId} messageId={messageId} onRegenerate={onRegenerate} />
          <RegenerateWithFeedbackButton chatId={chatId} messageId={messageId} onRegenerate={onRegenerate} />
        </>
      )}
      <EditButton chatId={chatId} messageId={messageId} />
      <DeleteButton chatId={chatId} messageId={messageId} />
      <DeleteAllBelowButton chatId={chatId} messageId={messageId} />
    </Stack>
  );
};
