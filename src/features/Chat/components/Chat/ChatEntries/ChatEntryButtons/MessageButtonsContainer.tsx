import { Stack } from "@mantine/core";
import { RegenerateButton } from "./RegenerateButton";
import { RegenerateWithFeedbackButton } from "./RegenerateWithFeedbackButton";
import { EditButton } from "./EditButton";
import { DeleteButton } from "./DeleteButton";
import { DeleteAllBelowButton } from "./DeleteAllBelowButton";
import { InspectMessageButton } from "./InspectMessageButton";
import { ViewCompressionButton } from "./ViewCompressionButton";

interface MessageButtonsContainerProps {
  chatId: string;
  messageId: string;
  isLastMessage: boolean;
  showRegenerate?: boolean;
  onRegenerate?: () => void;
  hasCompression?: boolean;
}

export const MessageButtonsContainer: React.FC<
  MessageButtonsContainerProps
> = ({
  chatId,
  messageId,
  showRegenerate = false,
  onRegenerate,
  hasCompression = false,
}) => {
  return (
    <Stack gap="xs" justify="center">
      {showRegenerate && (
        <>
          <RegenerateButton
            chatId={chatId}
            messageId={messageId}
            onRegenerate={onRegenerate}
          />
          <RegenerateWithFeedbackButton
            chatId={chatId}
            messageId={messageId}
            onRegenerate={onRegenerate}
          />
        </>
      )}
      {hasCompression && (
        <ViewCompressionButton chatId={chatId} messageId={messageId} />
      )}
      <EditButton chatId={chatId} messageId={messageId} />
      <InspectMessageButton chatId={chatId} messageId={messageId} />
      <DeleteButton chatId={chatId} messageId={messageId} />
      <DeleteAllBelowButton chatId={chatId} messageId={messageId} />
    </Stack>
  );
};
