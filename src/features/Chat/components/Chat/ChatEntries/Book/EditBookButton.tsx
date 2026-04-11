import { useState } from "react";
import { Button } from "@mantine/core";
import { RiEdit2Line } from "react-icons/ri";
import { EditBookModal } from "./EditBookModal";
import type { BookChatMessage } from "../../../../../../services/CQRS/UserChatProjection";
import { d } from "../../../../../../services/Dependencies";

interface EditBookButtonProps {
  chatId: string;
  bookId: string;
}

export const EditBookButton: React.FC<EditBookButtonProps> = ({
  chatId,
  bookId,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  const handleOpenModal = () => {
    const message = d
      .UserChatProjection(chatId)
      .GetMessage(bookId) as BookChatMessage;

    if (message && message.type === "book") {
      setTitle(message.data.title);
      setSummary(message.content || "");
      setShowModal(true);
    }
  };

  const handleSubmit = () => {
    if (title.trim() && summary.trim()) {
      d.ChatService(chatId).EditBook(bookId, title, summary);
    }
    setShowModal(false);
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  return (
    <>
      <Button
        size="xs"
        variant="light"
        color="blue"
        leftSection={<RiEdit2Line size={14} />}
        onClick={handleOpenModal}
        styles={{
          root: {
            backgroundColor: "rgba(34, 139, 230, 0.25)",
            "&:hover": {
              backgroundColor: "rgba(34, 139, 230, 0.35)",
            },
          },
        }}
      >
        Edit
      </Button>

      <EditBookModal
        opened={showModal}
        title={title}
        summary={summary}
        onTitleChange={setTitle}
        onSummaryChange={setSummary}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </>
  );
};
