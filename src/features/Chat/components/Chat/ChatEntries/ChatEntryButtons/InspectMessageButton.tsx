import { Button } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { RiEyeLine } from "react-icons/ri";

interface InspectMessageButtonProps {
  chatId: string;
  messageId: string;
}

export const InspectMessageButton: React.FC<InspectMessageButtonProps> = ({
  chatId,
  messageId,
}) => {
  const navigate = useNavigate();

  return (
    <Button
      size="xs"
      variant="light"
      color="gray"
      leftSection={<RiEyeLine size={14} />}
      onClick={() => navigate(`/chat/${chatId}/message/${messageId}`)}
      styles={{
        root: {
          backgroundColor: "rgba(160, 160, 160, 0.18)",
          "&:hover": {
            backgroundColor: "rgba(160, 160, 160, 0.28)",
          },
        },
      }}
    >
      Inspect
    </Button>
  );
};
