import React from "react";
import { NoteItem } from "./ChatFlow/NoteItem";
import "./ChatFlowDialog.css";
import { useNotes } from "../hooks/useNotes";

interface ChatFlowDialogProps {
  chatId: string;
  isOpen: boolean;
  onCancel: () => void;
}

export const ChatFlowDialog: React.FC<ChatFlowDialogProps> = ({
  chatId,
  isOpen,
  onCancel,
}) => {
  const { notes } = useNotes(chatId);

  if (!isOpen) return null;

  return (
    <div className="chat-flow-overlay">
      <div className="chat-flow-dialog">
        <div className="chat-flow-header">
          <h2>Chat Flow</h2>
          <button className="chat-flow-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="chat-flow-content">
          {notes && notes.length > 0 && (
            <div className="notes-container">
              {notes.map((note, index) => (
                <NoteItem key={index} note={note} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
