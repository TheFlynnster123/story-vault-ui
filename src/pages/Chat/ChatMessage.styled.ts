import styled, { keyframes } from "styled-components";
import { ChatTheme } from "../../theme/chatTheme";

/* ========================= */
/* Helper Functions          */
/* ========================= */
/**
 * Applies transparency to an rgba color string
 * @param color - rgba color string like "rgba(r, g, b, a)"
 * @param transparency - transparency value (0-1) to multiply with existing alpha
 * @returns modified rgba string with adjusted alpha
 */
const applyTransparency = (color: string, transparency: number): string => {
  const match = color.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
  );
  if (match) {
    const [, r, g, b, a = "1"] = match;
    const newAlpha = parseFloat(a) * transparency;
    return `rgba(${r}, ${g}, ${b}, ${newAlpha})`;
  }
  return color;
};

/* ========================= */
/* Animations                */
/* ========================= */
export const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

/* ========================= */
/* Wrappers                  */
/* ========================= */
export const MessageItem = styled.div<{ $type: "user" | "system" }>`
  animation: ${fadeIn} 0.3s ease-out forwards;
  text-align: ${({ $type }) => ($type === "user" ? "right" : "left")};
`;

export const MessageContentWrapper = styled.div`
  margin-top: 1rem;
  position: relative;
  display: inline-block;
  max-width: 85%;

  /* When overlay exists */
  &:has(.message-overlay) {
    min-width: 280px;
  }

  &:has(.message-overlay) .message-text {
    min-height: 220px;
  }

  @media (max-width: 768px) {
    max-width: 90%;

    &:has(.message-overlay) {
      min-width: 240px;
    }

    &:has(.message-overlay) .message-text {
      min-height: 200px;
    }
  }

  @media (max-width: 480px) {
    max-width: 95%;

    &:has(.message-overlay) {
      min-width: 240px;
    }

    &:has(.message-overlay) .message-text {
      min-height: 240px;
    }
  }

  @media (min-width: 1200px) {
    &:has(.message-overlay) {
      min-width: 320px;
    }

    &:has(.message-overlay) .message-text {
      min-height: 240px;
    }
  }
`;

/* ========================= */
/* Message Text              */
/* ========================= */
export const MessageText = styled.div<{ $type: "user" | "system" }>`
  font-size: small;
  padding: 8px 12px;
  border-radius: 10px;
  display: inline-block;
  width: 100%;
  box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.5);
  white-space: pre-wrap;
  cursor: default;
  box-sizing: border-box;
  transition: min-height 0.2s ease, min-width 0.2s ease, opacity 0.2s ease;

  ${({ $type }) =>
    $type === "user"
      ? `
    background-color: ${applyTransparency(
      ChatTheme.messages.user.background,
      ChatTheme.chatEntry.transparency
    )};
    color: ${ChatTheme.messages.user.text};
  `
      : `
    background-color: ${applyTransparency(
      ChatTheme.messages.assistant.background,
      ChatTheme.chatEntry.transparency
    )};
    color: ${ChatTheme.messages.assistant.text};
  `}

  &.clickable {
    cursor: pointer;
  }
`;

/* ========================= */
/* Markdown Formatting       */
/* ========================= */
export const QuotedText = styled.span`
  font-style: italic;
  color: inherit;
  display: inline-block;
`;

export const EmphasizedText = styled.span<{ $type: "user" | "system" }>`
  font-weight: bold;
  color: inherit;
  background-color: ${({ $type }) =>
    $type === "user" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"};
  border-radius: 3px;
  padding: 0 3px;
`;

/* ========================= */
/* Buttons Row               */
/* ========================= */
export const MessageDeleteButtons = styled.div<{ $type: "user" | "system" }>`
  display: flex;
  gap: 8px;
  animation: ${fadeIn} 0.2s ease-out;
  justify-content: ${({ $type }) =>
    $type === "user" ? "flex-end" : "flex-start"};
`;

export const DeleteButton = styled.button`
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:hover {
    background: #ff4444;
    color: white;
    border-color: #cc0000;
    transform: scale(1.05);
  }
`;

export const RegenerateButton = styled(DeleteButton)`
  &:hover {
    background: #007bff;
    color: white;
    border-color: #0056b3;
    transform: scale(1.05);
  }
`;

/* ========================= */
/* Delete Confirmation Modal */
/* ========================= */
export const DeleteConfirmationOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeIn} 0.2s ease-out;
`;

export const DeleteConfirmationDialog = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  animation: ${fadeIn} 0.3s ease-out;

  p {
    margin: 0 0 20px 0;
    color: #333;
    line-height: 1.4;
  }

  @media (max-width: 768px) {
    margin: 20px;
    width: calc(100% - 40px);
  }
`;

export const DeleteConfirmationButtons = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

export const ConfirmDeleteButton = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;

  &:hover {
    background: #c82333;
  }
`;

export const CancelDeleteButton = styled.button`
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;

  &:hover {
    background: #5a6268;
  }
`;
