import { Stack } from "@mantine/core";
import { RegeneratePlanButton } from "./RegeneratePlanButton";
import { RegeneratePlanWithFeedbackButton } from "./RegeneratePlanWithFeedbackButton";
import { DiscussDirectionButton } from "./DiscussDirectionButton";
import { EditButton } from "./EditButton";
import { DeleteButton } from "./DeleteButton";

interface PlanMessageButtonsContainerProps {
  chatId: string;
  messageId: string;
  planDefinitionId: string;
  priorContent: string;
}

export const PlanMessageButtonsContainer: React.FC<
  PlanMessageButtonsContainerProps
> = ({ chatId, messageId, planDefinitionId, priorContent }) => {
  return (
    <Stack gap="xs" justify="center">
      <RegeneratePlanButton
        chatId={chatId}
        planDefinitionId={planDefinitionId}
        priorContent={priorContent}
      />
      <RegeneratePlanWithFeedbackButton
        chatId={chatId}
        planDefinitionId={planDefinitionId}
        priorContent={priorContent}
      />
      <DiscussDirectionButton
        chatId={chatId}
        planDefinitionId={planDefinitionId}
      />
      <EditButton chatId={chatId} messageId={messageId} />
      <DeleteButton chatId={chatId} messageId={messageId} />
    </Stack>
  );
};
