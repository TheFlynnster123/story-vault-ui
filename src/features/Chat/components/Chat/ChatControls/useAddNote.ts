import { useState } from "react";
import { d } from "../../../../../services/Dependencies";

interface UseAddNoteParams {
  chatId: string;
}

export const useAddNote = ({ chatId }: UseAddNoteParams) => {
  const [showModal, setShowModal] = useState(false);
  const [content, setContent] = useState("");
  const [hasExpiration, setHasExpiration] = useState(true);
  const [expiresAfterMessages, setExpiresAfterMessages] = useState<number>(10);

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setContent("");
    setHasExpiration(true);
    setExpiresAfterMessages(10);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      await d
        .ChatService(chatId)
        .AddNote(content, hasExpiration ? expiresAfterMessages : null);
      handleCloseModal();
    } catch (error) {
      d.ErrorService().log("Failed to create note", error);
    }
  };

  return {
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
  };
};
