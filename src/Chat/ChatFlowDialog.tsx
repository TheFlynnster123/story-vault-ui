import React from "react";
import { useChatFlowStore } from "../stores/chatFlowStore";
import "./ChatFlowDialog.css";

interface ChatFlowDialogProps {
  isOpen: boolean;
  onCancel: () => void;
}

export const ChatFlowDialog: React.FC<ChatFlowDialogProps> = ({
  isOpen,
  onCancel,
}) => {
  const { isGeneratingPlanningNotes, isGeneratingResponse, allNotes } =
    useChatFlowStore();

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
          {isGeneratingPlanningNotes && <p>Generating planning notes...</p>}
          {allNotes && allNotes.length > 0 && (
            <div className="notes-container">
              {allNotes.map((note, index) => (
                <pre key={index}>{note.content}</pre>
              ))}
            </div>
          )}
          {isGeneratingResponse && <p>Generating response...</p>}
        </div>
      </div>
    </div>
  );
};
