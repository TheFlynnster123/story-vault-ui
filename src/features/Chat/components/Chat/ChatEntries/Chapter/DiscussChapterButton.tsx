import { Button } from "@mantine/core";
import { RiChat3Line } from "react-icons/ri";
import { useNavigate } from "react-router-dom";

interface DiscussChapterButtonProps {
  chatId: string;
  chapterId: string;
}

export const DiscussChapterButton: React.FC<DiscussChapterButtonProps> = ({
  chatId,
  chapterId,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/chat/${chatId}/chapter/${chapterId}/discuss`);
  };

  return (
    <Button
      size="xs"
      variant="light"
      color="yellow"
      onClick={handleClick}
      leftSection={<RiChat3Line size={14} />}
      styles={{
        root: {
          backgroundColor: "rgba(199, 152, 0, 0.25)",
          "&:hover": {
            backgroundColor: "rgba(199, 152, 0, 0.35)",
          },
        },
      }}
    >
      Discuss Summary
    </Button>
  );
};
