import React, { useState } from "react";
import type { ChatFlowV2Step } from "../constants/chatFlowV2";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";
import "./ChatFlowCollapsible.css";

interface ChatFlowCollapsibleV2Props {
  chatFlowHistory: ChatFlowV2Step[];
  onDeleteNotes?: () => Promise<void>;
}

const STEP_COLORS: Record<ChatFlowV2Step["stepType"], string> = {
  planning_notes: "#4A90E2",
  system_message: "#50E3C2",
  refinement_notes: "#F39C12",
  refined_message: "#27AE60",
  analysis_notes: "#9B59B6",
};

const STEP_LABELS: Record<ChatFlowV2Step["stepType"], string> = {
  planning_notes: "Planning Notes",
  system_message: "System Message",
  refinement_notes: "Refinement Notes",
  refined_message: "Refined Message",
  analysis_notes: "Analysis Notes",
};

export const ChatFlowCollapsibleV2: React.FC<ChatFlowCollapsibleV2Props> = ({
  chatFlowHistory,
  onDeleteNotes,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasContent = chatFlowHistory && chatFlowHistory.length > 0;
  const hasNotes = chatFlowHistory.some(
    (step) =>
      step.stepType === "analysis_notes" ||
      step.stepType === "planning_notes" ||
      step.stepType === "refinement_notes"
  );

  const handleDeleteNotes = async () => {
    if (!onDeleteNotes) return;

    setIsDeleting(true);
    try {
      await onDeleteNotes();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete notes:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!hasContent) {
    return null;
  }

  return (
    <div className="chat-flow-collapsible">
      <div className="chat-flow-header">
        <button
          className="chat-flow-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>{isExpanded ? "Hide" : "Show"} Chat Flow v2</span>
          {isExpanded ? <IoChevronUp /> : <IoChevronDown />}
        </button>
        {hasNotes && onDeleteNotes && (
          <button
            className="delete-notes-button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            title="Delete all notes"
          >
            🗑️
          </button>
        )}
      </div>
      {isExpanded && (
        <div className="chat-flow-history">
          {/* Display Chat Flow Steps */}
          {chatFlowHistory.map((step) => (
            <div
              key={step.id}
              className="chat-flow-step"
              style={{ borderLeftColor: STEP_COLORS[step.stepType] }}
            >
              <div
                className="chat-flow-step-header"
                style={{ color: STEP_COLORS[step.stepType] }}
              >
                {STEP_LABELS[step.stepType]}
                <span className="step-timestamp">
                  {new Date(step.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="chat-flow-step-content">{step.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-dialog">
            <h3>Delete Notes</h3>
            <p>
              This will permanently delete all saved notes including:
              <br />
              • Analysis Notes
              <br />
              • Story Summary
              <br />• User Preferences
            </p>
            <div className="delete-confirm-buttons">
              <button
                className="delete-confirm-cancel"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="delete-confirm-delete"
                onClick={handleDeleteNotes}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
