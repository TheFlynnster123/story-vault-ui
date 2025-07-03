import React, { useState } from "react";
import type { ChatFlowStep } from "../hooks/useChatFlow";
import type { PreResponseNote, PostResponseNote } from "../models";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";
import "./ChatFlowCollapsible.css";

interface ChatFlowCollapsibleProps {
  chatFlowHistory: ChatFlowStep[];
  preResponseNotes: PreResponseNote[];
  postResponseNotes: PostResponseNote[];
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
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasContent =
    (chatFlowHistory && chatFlowHistory.length > 0) ||
    preResponseNotes.some(
      (note) => note.hasContent?.() || note.getContent?.()
    ) ||
    postResponseNotes.some((note) => note.hasContent());

  if (!hasContent) {
    return null;
  }

  return (
    <div className="chat-flow-collapsible">
      <button
        className="chat-flow-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>{isExpanded ? "Hide" : "Show"} Chat Flow & Notes</span>
        {isExpanded ? <IoChevronUp /> : <IoChevronDown />}
      </button>
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
    </div>
  );
};
