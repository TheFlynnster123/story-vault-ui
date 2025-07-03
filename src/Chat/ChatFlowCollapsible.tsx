import React, { useState } from "react";
import type { ChatFlowStep } from "../hooks/useChatFlow";
import type { PreResponseNote, PostResponseNote } from "../models";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";
import "./ChatFlowCollapsible.css";

interface ChatFlowCollapsibleProps {
  chatFlowHistory: ChatFlowStep[];
  preResponseNotes: PreResponseNote[];
  postResponseNotes: PostResponseNote[];
  onDeleteNotes?: () => Promise<void>;
}

const STEP_COLORS: Record<ChatFlowStep["stepType"], string> = {
  planning_notes: "#4A90E2",
  draft_message: "#50E3C2",
};

const NOTE_COLORS: Record<string, string> = {
  "story-summary": "#E67E22",
  "user-preferences": "#9B59B6",
  "planning-notes": "#4A90E2",
};

export const ChatFlowCollapsible: React.FC<ChatFlowCollapsibleProps> = ({
  chatFlowHistory,
  preResponseNotes,
  postResponseNotes,
  onDeleteNotes,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasContent =
    (chatFlowHistory && chatFlowHistory.length > 0) ||
    preResponseNotes.some(
      (note) => note.hasContent?.() || note.getContent?.()
    ) ||
    postResponseNotes.some((note) => note.hasContent());

  const hasNotes = postResponseNotes.some((note) => note.hasContent());

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
          <span>{isExpanded ? "Hide" : "Show"} Chat Flow & Notes</span>
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
                {step.stepType.replace(/_/g, " ")}
              </div>
              <div className="chat-flow-step-content">{step.content}</div>
            </div>
          ))}

          {/* Display Pre-Response Notes */}
          {preResponseNotes.map((note) => {
            const content = note.getContent?.() || "";
            if (!content) return null;

            return (
              <div
                key={`pre-${note.getNoteName()}`}
                className="chat-flow-step"
                style={{
                  borderLeftColor: NOTE_COLORS[note.getNoteName()] || "#666",
                }}
              >
                <div
                  className="chat-flow-step-header"
                  style={{ color: NOTE_COLORS[note.getNoteName()] || "#666" }}
                >
                  {note.getContextLabel()}
                </div>
                <div className="chat-flow-step-content">{content}</div>
              </div>
            );
          })}

          {/* Display Post-Response Notes */}
          {postResponseNotes.map((note) => {
            if (!note.hasContent()) return null;

            return (
              <div
                key={`post-${note.getNoteName()}`}
                className="chat-flow-step"
                style={{
                  borderLeftColor: NOTE_COLORS[note.getNoteName()] || "#666",
                }}
              >
                <div
                  className="chat-flow-step-header"
                  style={{ color: NOTE_COLORS[note.getNoteName()] || "#666" }}
                >
                  {note.getNoteName() === "story-summary"
                    ? "Story Summary"
                    : note.getNoteName() === "user-preferences"
                    ? "User Preferences"
                    : note.getNoteName()}
                </div>
                <div className="chat-flow-step-content">
                  {note.getContent()}
                </div>
              </div>
            );
          })}
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
