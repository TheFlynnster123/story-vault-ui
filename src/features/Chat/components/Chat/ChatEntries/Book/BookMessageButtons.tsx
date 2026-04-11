import { Stack } from "@mantine/core";
import { EditBookButton } from "./EditBookButton";
import { DeleteBookButton } from "./DeleteBookButton";

interface BookMessageButtonsProps {
  chatId: string;
  bookId: string;
}

export const BookMessageButtons: React.FC<BookMessageButtonsProps> = ({
  chatId,
  bookId,
}) => {
  return (
    <Stack gap="xs" justify="center" mt="md">
      <EditBookButton chatId={chatId} bookId={bookId} />
      <DeleteBookButton chatId={chatId} bookId={bookId} />
    </Stack>
  );
};
