import { Stack } from "@mantine/core";
import { EditBookButton } from "./EditBookButton";
import { DeleteBookButton } from "./DeleteBookButton";
import { DiscussBookButton } from "./DiscussBookButton";
import { InspectMessageButton } from "../ChatEntryButtons/InspectMessageButton";

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
      <InspectMessageButton chatId={chatId} messageId={bookId} />
      <DiscussBookButton chatId={chatId} bookId={bookId} />
      <DeleteBookButton chatId={chatId} bookId={bookId} />
    </Stack>
  );
};
