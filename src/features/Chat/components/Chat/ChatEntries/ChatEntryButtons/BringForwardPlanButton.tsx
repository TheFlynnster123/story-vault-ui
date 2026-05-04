import { Button } from "@mantine/core";
import { RiArrowDownLine } from "react-icons/ri";
import { d } from "../../../../../../services/Dependencies";

interface BringForwardPlanButtonProps {
  chatId: string;
  planDefinitionId: string;
  planName: string;
  content: string;
}

export const BringForwardPlanButton: React.FC<BringForwardPlanButtonProps> = ({
  chatId,
  planDefinitionId,
  planName,
  content,
}) => {
  const handleBringForward = () => {
    d.ChatService(chatId).AddPlanMessage(planDefinitionId, planName, content);
  };

  return (
    <Button
      size="xs"
      variant="light"
      color="teal"
      onClick={handleBringForward}
      leftSection={<RiArrowDownLine size={14} />}
      styles={{
        root: {
          backgroundColor: "rgba(32, 201, 151, 0.25)",
          "&:hover": {
            backgroundColor: "rgba(32, 201, 151, 0.35)",
          },
          minWidth: "36px",
          padding: "0 8px",
        },
      }}
      title="Bring Forward"
    >
      Bring Forward
    </Button>
  );
};
