import { useState } from "react";
import { Button } from "@mantine/core";
import { RiEdit2Line } from "react-icons/ri";
import { ChapterEditorModal } from "./ChapterEditorModal";
import type { ChapterChatMessage } from "../../../../../../services/CQRS/UserChatProjection";
import { d } from "../../../../../../services/Dependencies";

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
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenModal = () => {
    const message = d
      .UserChatProjection(chatId)
      .GetMessage(chapterId) as ChapterChatMessage;

    if (message && message.type === "chapter") {
      setTitle(message.data.title);
      setSummary(message.content || "");
      setShowModal(true);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !summary.trim()) return;

    setIsSaving(true);
    try {
      await d
        .ChatService(chatId)
        .EditChapter(chapterId, title.trim(), summary.trim());
      setShowModal(false);
    } catch (error) {
      d.ErrorService().log("Failed to edit chapter", error);
    } finally {
      setIsSaving(false);
    }
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

      <ChapterEditorModal
        opened={showModal}
        heading="Edit Chapter"
        description="Edit the chapter title and summary."
        submitLabel="Save Changes"
        title={title}
        summary={summary}
        isSubmitting={isSaving}
        onTitleChange={setTitle}
        onSummaryChange={setSummary}
        onSubmit={handleSubmit}
        onClose={handleCancel}
      />
    </>
  );
};
