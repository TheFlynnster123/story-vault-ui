import { Stack } from "@mantine/core";
import { RegenerateButton } from "./RegenerateButton";
import { RegenerateWithFeedbackButton } from "./RegenerateWithFeedbackButton";
import { DeleteButton } from "./DeleteButton";
import { DeleteAllBelowButton } from "./DeleteAllBelowButton";

interface MessageButtonsContainerProps {
  chatId: string;
  messageId: string;
  isLastMessage: boolean;
}

export const MessageButtonsContainer: React.FC<
  MessageButtonsContainerProps
> = ({ chatId, messageId, isLastMessage }) => {
  return (
    <Stack gap="xs" justify="center">
      {isLastMessage && (
        <>
          <RegenerateButton chatId={chatId} messageId={messageId} />
          <RegenerateWithFeedbackButton chatId={chatId} messageId={messageId} />
        </>
      )}
      <DeleteButton chatId={chatId} messageId={messageId} />
      <DeleteAllBelowButton chatId={chatId} messageId={messageId} />
    </Stack>
  );
};
