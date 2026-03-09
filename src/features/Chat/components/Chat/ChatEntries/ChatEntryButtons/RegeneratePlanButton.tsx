import { Button } from "@mantine/core";
import { RiRefreshLine } from "react-icons/ri";
import { d } from "../../../../../../services/Dependencies";

interface RegeneratePlanButtonProps {
  chatId: string;
  planDefinitionId: string;
  priorContent: string;
}

export const RegeneratePlanButton: React.FC<RegeneratePlanButtonProps> = ({
  chatId,
  planDefinitionId,
  priorContent,
}) => {
  const handleRegenerate = () => {
    d.PlanGenerationService(chatId).regeneratePlanFromMessage(
      planDefinitionId,
      priorContent,
    );
  };

  return (
    <Button
      size="xs"
      variant="light"
      color="blue"
      onClick={handleRegenerate}
      leftSection={<RiRefreshLine size={14} />}
      styles={{
        root: {
          backgroundColor: "rgba(34, 139, 230, 0.25)",
          "&:hover": {
            backgroundColor: "rgba(34, 139, 230, 0.35)",
          },
          minWidth: "36px",
          padding: "0 8px",
        },
      }}
      title="Regenerate Plan"
    >
      Regenerate
    </Button>
  );
};
