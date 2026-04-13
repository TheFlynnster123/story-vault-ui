import { Button } from "@mantine/core";
import { RiChat3Line } from "react-icons/ri";
import { useNavigate } from "react-router-dom";

interface DiscussDirectionButtonProps {
  chatId: string;
  planDefinitionId: string;
}

export const DiscussDirectionButton: React.FC<DiscussDirectionButtonProps> = ({
  chatId,
  planDefinitionId,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/chat/${chatId}/plan/${planDefinitionId}/direction`);
  };

  return (
    <Button
      size="xs"
      variant="light"
      color="teal"
      onClick={handleClick}
      leftSection={<RiChat3Line size={14} />}
      styles={{
        root: {
          backgroundColor: "rgba(0, 188, 212, 0.25)",
          "&:hover": {
            backgroundColor: "rgba(0, 188, 212, 0.35)",
          },
        },
      }}
    >
      Discuss Direction
    </Button>
  );
};
