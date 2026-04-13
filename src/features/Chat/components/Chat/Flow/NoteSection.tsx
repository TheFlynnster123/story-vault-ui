import React from "react";
import { CreateNoteModal } from "../ChatControls/CreateNoteModal";
import { useAddNote } from "../ChatControls/useAddNote";
import { AddNoteButton } from "./AddNoteButton";

interface NoteSectionProps {
  chatId: string;
}

export const NoteSection: React.FC<NoteSectionProps> = ({ chatId }) => {
  const {
    showModal,
    content,
    hasExpiration,
    expiresAfterMessages,
    setContent,
    setHasExpiration,
    setExpiresAfterMessages,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
  } = useAddNote({ chatId });

  return (
    <>
      <AddNoteButton onClick={handleOpenModal} />
      <CreateNoteModal
        opened={showModal}
        content={content}
        hasExpiration={hasExpiration}
        expiresAfterMessages={expiresAfterMessages}
        onContentChange={setContent}
        onHasExpirationChange={setHasExpiration}
        onExpiresAfterMessagesChange={setExpiresAfterMessages}
        onSubmit={handleSubmit}
        onCancel={handleCloseModal}
      />
    </>
  );
};
