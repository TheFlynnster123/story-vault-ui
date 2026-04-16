import { Button } from "@mantine/core";
import { RiChat3Line } from "react-icons/ri";
import { useNavigate } from "react-router-dom";

interface DiscussStoryButtonProps {
  chatId: string;
}

export const DiscussStoryButton: React.FC<DiscussStoryButtonProps> = ({
  chatId,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/chat/${chatId}/story/discuss`);
  };

  return (
    <Button
      size="xs"
      variant="light"
      color="violet"
      onClick={handleClick}
      leftSection={<RiChat3Line size={14} />}
      styles={{
        root: {
          backgroundColor: "rgba(138, 43, 226, 0.25)",
          "&:hover": {
            backgroundColor: "rgba(138, 43, 226, 0.35)",
          },
        },
      }}
    >
      Discuss Story
    </Button>
  );
};
