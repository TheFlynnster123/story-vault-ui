import { useState } from "react";
import { Button } from "@mantine/core";
import { RiEdit2Line } from "react-icons/ri";
import { EditChapterModal } from "./EditChapterModal";
import type { ChapterChatMessage } from "../../../../services/CQRS/UserChatProjection";
import { d } from "../../../../services/Dependencies";

interface EditChapterButtonProps {
  chatId: string;
  chapterId: string;
}

export const EditChapterButton: React.FC<EditChapterButtonProps> = ({
  chatId,
  chapterId,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [nextChapterDirection, setNextChapterDirection] = useState("");

  const handleOpenModal = () => {
    const message = d
      .UserChatProjection(chatId)
      .GetMessage(chapterId) as ChapterChatMessage;

    if (message && message.type === "chapter") {
      setTitle(message.data.title);
      setSummary(message.content || "");
      setNextChapterDirection(message.data.nextChapterDirection || "");
      setShowModal(true);
    }
  };

  const handleSubmit = () => {
    if (title.trim() && summary.trim()) {
      d.ChatService(chatId).EditChapter(
        chapterId,
        title,
        summary,
        nextChapterDirection || undefined
      );
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

      <EditChapterModal
        opened={showModal}
        title={title}
        summary={summary}
        nextChapterDirection={nextChapterDirection}
        onTitleChange={setTitle}
        onSummaryChange={setSummary}
        onNextChapterDirectionChange={setNextChapterDirection}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </>
  );
};
