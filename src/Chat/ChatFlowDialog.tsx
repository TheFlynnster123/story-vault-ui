import React from "react";
import { NoteItem } from "./ChatFlow/NoteItem";
import "./ChatFlowDialog.css";
import { useNotes } from "../hooks/useNotes";

interface ChatFlowDialogProps {
  chatId: string;
  isOpen: boolean;
  onCancel: () => void;
  onOpen: () => void;
  status: string | undefined;
}

export const ChatFlowDialog: React.FC<ChatFlowDialogProps> = ({
  status,
  chatId,
  isOpen,
  onCancel,
  onOpen,
}) => {
  const { notes } = useNotes(chatId);

  return (
    <div
      onClick={isOpen ? onCancel : onOpen}
      className={`chat-flow-container ${isOpen ? "expanded" : ""}`}
    >
      <div className="chat-flow-header">{status || "Ready"}</div>
      {isOpen && (
        <div className="chat-flow-content">
          {notes && notes.length > 0 && (
            <div className="notes-container">
              {notes.map((note, index) => (
                <NoteItem key={index} note={note} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
