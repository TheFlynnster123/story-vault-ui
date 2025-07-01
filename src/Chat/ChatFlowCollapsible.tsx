import React, { useState } from "react";
import type { ChatFlowStep } from "../hooks/useChatFlow";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";
import "./ChatFlowCollapsible.css";

interface ChatFlowCollapsibleProps {
  chatFlowHistory: ChatFlowStep[];
}

const STEP_COLORS: Record<ChatFlowStep["stepType"], string> = {
  planning_notes: "#4A90E2",
  draft_message: "#50E3C2",
};

export const ChatFlowCollapsible: React.FC<ChatFlowCollapsibleProps> = ({
  chatFlowHistory,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!chatFlowHistory || chatFlowHistory.length === 0) {
    return null;
  }

  return (
    <div className="chat-flow-collapsible">
      <button
        className="chat-flow-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>{isExpanded ? "Hide" : "Show"} Chat Flow</span>
        {isExpanded ? <IoChevronUp /> : <IoChevronDown />}
      </button>
      {isExpanded && (
        <div className="chat-flow-history">
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
        </div>
      )}
    </div>
  );
};
