import { Button } from "@mantine/core";
import { RiChat3Line } from "react-icons/ri";
import { useNavigate } from "react-router-dom";

interface DiscussBookButtonProps {
  chatId: string;
  bookId: string;
}

export const DiscussBookButton: React.FC<DiscussBookButtonProps> = ({
  chatId,
  bookId,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/chat/${chatId}/book/${bookId}/discuss`);
  };

  return (
    <Button
      size="xs"
      variant="light"
      color="green"
      onClick={handleClick}
      leftSection={<RiChat3Line size={14} />}
      styles={{
        root: {
          backgroundColor: "rgba(16, 185, 129, 0.25)",
          "&:hover": {
            backgroundColor: "rgba(16, 185, 129, 0.35)",
          },
        },
      }}
    >
      Discuss Summary
    </Button>
  );
};
