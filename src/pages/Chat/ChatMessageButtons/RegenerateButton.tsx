import { Button } from "@mantine/core";
import { RiRefreshLine } from "react-icons/ri";
import { useChatGeneration } from "../../../hooks/useChatGeneration";

interface RegenerateButtonProps {
  chatId: string;
  messageId: string;
}

export const RegenerateButton: React.FC<RegenerateButtonProps> = ({
  chatId,
  messageId,
}) => {
  const { regenerateResponse } = useChatGeneration({ chatId });

  const handleRegenerate = () => {
    regenerateResponse(messageId);
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
      title="Regenerate"
    >
      Regenerate
    </Button>
  );
};
