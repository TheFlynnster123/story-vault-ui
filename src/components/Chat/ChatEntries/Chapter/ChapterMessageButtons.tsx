import { Stack } from "@mantine/core";
import { EditChapterButton } from "./EditChapterButton";
import { DeleteChapterButton } from "./DeleteChapterButton";

interface ChapterMessageButtonsProps {
  chatId: string;
  chapterId: string;
}

export const ChapterMessageButtons: React.FC<ChapterMessageButtonsProps> = ({
  chatId,
  chapterId,
}) => {
  return (
    <Stack gap="xs" justify="center" mt="md">
      <EditChapterButton chatId={chatId} chapterId={chapterId} />
      <DeleteChapterButton chatId={chatId} chapterId={chapterId} />
    </Stack>
  );
};
