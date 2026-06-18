import { Stack } from "@mantine/core";
import { RegeneratePlanButton } from "./RegeneratePlanButton";
import { BringForwardPlanButton } from "./BringForwardPlanButton";
import { DiscussPlanButton } from "./DiscussPlanButton";
import { EditButton } from "./EditButton";
import { DeleteButton } from "./DeleteButton";
import { InspectMessageButton } from "./InspectMessageButton";

interface PlanMessageButtonsContainerProps {
  chatId: string;
  messageId: string;
  planDefinitionId: string;
  planName: string;
  priorContent: string;
}

export const PlanMessageButtonsContainer: React.FC<
  PlanMessageButtonsContainerProps
> = ({ chatId, messageId, planDefinitionId, planName, priorContent }) => {
  return (
    <Stack gap="xs" justify="center">
      <RegeneratePlanButton
        chatId={chatId}
        planDefinitionId={planDefinitionId}
        priorContent={priorContent}
      />
      <BringForwardPlanButton
        chatId={chatId}
        planDefinitionId={planDefinitionId}
        planName={planName}
        content={priorContent}
      />
      <DiscussPlanButton chatId={chatId} planDefinitionId={planDefinitionId} />
      <EditButton chatId={chatId} messageId={messageId} />
      <InspectMessageButton chatId={chatId} messageId={messageId} />
      <DeleteButton chatId={chatId} messageId={messageId} />
    </Stack>
  );
};
