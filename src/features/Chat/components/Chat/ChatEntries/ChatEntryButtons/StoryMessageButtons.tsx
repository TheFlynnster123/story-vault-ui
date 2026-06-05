import { Button, Group } from "@mantine/core";
import { RiEditLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { DiscussStoryButton } from "./DiscussStoryButton";
import { InspectMessageButton } from "./InspectMessageButton";

interface StoryMessageButtonsProps {
  chatId: string;
  messageId: string;
}

export const StoryMessageButtons: React.FC<StoryMessageButtonsProps> = ({
  chatId,
  messageId,
}) => {
  const navigate = useNavigate();

  const handleEdit = () => {
    navigate(`/chat/${chatId}/story/edit`);
  };

  return (
    <Group>
      <Button
        leftSection={<RiEditLine size={16} />}
        variant="light"
        onClick={handleEdit}
      >
        Edit Story
      </Button>
      <InspectMessageButton chatId={chatId} messageId={messageId} />
      <DiscussStoryButton chatId={chatId} />
    </Group>
  );
};
