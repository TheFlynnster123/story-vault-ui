import React, { useState } from "react";
import type { ChatFlowStep } from "../hooks/useChatFlow";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";
import "./ChatFlowCollapsible.css";

interface ChatFlowCollapsibleProps {
  chatFlowHistory: ChatFlowStep[];
  storySummary?: string;
  userPreferences?: string;
}

const STEP_COLORS: Record<ChatFlowStep["stepType"], string> = {
  planning_notes: "#4A90E2",
  draft_message: "#50E3C2",
};

const NOTE_COLORS = {
  story_summary: "#E67E22",
  user_preferences: "#9B59B6",
};

export const ChatFlowCollapsible: React.FC<ChatFlowCollapsibleProps> = ({
  chatFlowHistory,
  storySummary,
  userPreferences,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasContent =
    (chatFlowHistory && chatFlowHistory.length > 0) ||
    storySummary ||
    userPreferences;

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

          {/* Display Story Summary */}
          {storySummary && (
            <div
              className="chat-flow-step"
              style={{ borderLeftColor: NOTE_COLORS.story_summary }}
            >
              <div
                className="chat-flow-step-header"
                style={{ color: NOTE_COLORS.story_summary }}
              >
                Story Summary
              </div>
              <div className="chat-flow-step-content">{storySummary}</div>
            </div>
          )}

          {/* Display User Preferences */}
          {userPreferences && (
            <div
              className="chat-flow-step"
              style={{ borderLeftColor: NOTE_COLORS.user_preferences }}
            >
              <div
                className="chat-flow-step-header"
                style={{ color: NOTE_COLORS.user_preferences }}
              >
                User Preferences
              </div>
              <div className="chat-flow-step-content">{userPreferences}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
