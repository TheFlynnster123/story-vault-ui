import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  MessageContentWrapper,
  MessageItem,
  PlanMessageHeader,
  PlanMessageText,
} from "./ChatMessage.styled";
import type { ChainOfThoughtChatMessage } from "../../../../../services/CQRS/UserChatProjection";

interface ChainOfThoughtMessageProps {
  message: ChainOfThoughtChatMessage;
}

export const ChainOfThoughtMessage: React.FC<ChainOfThoughtMessageProps> = ({
  message,
}) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => setExpanded(!expanded);

  return (
    <MessageItem $type="system">
      <MessageContentWrapper>
        <PlanMessageText
          className="message-text"
          style={{ borderLeftColor: "rgba(63, 81, 181, 0.5)" }}
        >
          <PlanMessageHeader
            className="clickable"
            onClick={toggleExpand}
            style={{ color: "rgba(63, 81, 181, 1)" }}
          >
            🧠 {message.data.chainOfThoughtName} - Step{" "}
            {message.data.stepIndex + 1} {expanded ? "▾" : "▸"}
          </PlanMessageHeader>

          {expanded && (
            <div>
              <div
                style={{
                  fontSize: "0.85em",
                  color: "rgba(255, 255, 255, 0.6)",
                  marginBottom: "8px",
                  fontStyle: "italic",
                }}
              >
                Prompt: {message.data.stepPrompt}
              </div>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </PlanMessageText>
      </MessageContentWrapper>
    </MessageItem>
  );
};
