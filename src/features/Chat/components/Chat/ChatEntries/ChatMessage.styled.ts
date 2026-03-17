import styled, { keyframes } from "styled-components";
import { Theme } from "../../../../../components/Theme";

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
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
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
export const MessageItem = styled.div<{ $type: "user" | "system" | "story" }>`
  animation: ${fadeIn} 0.3s ease-out forwards;
  text-align: ${({ $type }) => ($type === "user" ? "right" : "left")};
`;

export const MessageContentWrapper = styled.div<{ $fullWidth?: boolean }>`
  margin-top: 1rem;
  position: relative;
  display: ${({ $fullWidth }) => ($fullWidth ? "block" : "inline-block")};
  max-width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "85%")};

  /* When overlay exists */
  &:has(.message-overlay) {
    min-width: 280px;
  }

  &:has(.message-overlay) .message-text {
    min-height: 220px;
  }

  @media (max-width: 768px) {
    max-width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "90%")};

    &:has(.message-overlay) {
      min-width: 240px;
    }

    &:has(.message-overlay) .message-text {
      min-height: 200px;
    }
  }

  @media (max-width: 480px) {
    max-width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "95%")};

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
export const MessageText = styled.div<{ $type: "user" | "system" | "story" }>`
  font-size: small;
  padding: 8px 12px;
  border-radius: 10px;
  display: inline-block;
  width: 100%;
  box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.5);
  white-space: pre-wrap;
  cursor: default;
  box-sizing: border-box;
  transition:
    min-height 0.2s ease,
    min-width 0.2s ease,
    opacity 0.2s ease;

  ${({ $type }) =>
    $type === "user"
      ? `
    background-color: ${applyTransparency(
      Theme.messages.user.background,
      Theme.chatEntry.transparency,
    )};
    color: ${Theme.messages.user.text};
  `
      : $type === "story"
        ? `
    background-color: ${applyTransparency(
      Theme.messages.assistant.background,
      Theme.chatEntry.transparency,
    )};
    color: ${Theme.messages.assistant.text};
    border-left: 4px solid #7950f2;
  `
        : `
    background-color: ${applyTransparency(
      Theme.messages.assistant.background,
      Theme.chatEntry.transparency,
    )};
    color: ${Theme.messages.assistant.text};
  `}

  &.clickable {
    cursor: pointer;
  }
`;

/**
 * Styled text container for plan messages in the chat timeline.
 * Uses the teal/cyan theme to visually distinguish plans from conversation.
 * Does NOT use white-space: pre-wrap so markdown block elements render correctly.
 */
export const PlanMessageText = styled.div`
  font-size: small;
  padding: 8px 12px;
  border-radius: 10px;
  display: inline-block;
  width: 100%;
  box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.5);
  cursor: default;
  box-sizing: border-box;
  overflow-wrap: break-word;
  word-break: break-word;

  pre,
  code {
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }
  transition:
    min-height 0.2s ease,
    min-width 0.2s ease,
    opacity 0.2s ease;

  background-color: ${applyTransparency(
    "rgba(0, 131, 143, 0.8)",
    Theme.chatEntry.transparency,
  )};
  color: ${Theme.messages.assistant.text};
  border-left: 4px solid rgba(0, 188, 212, 1);

  .clickable {
    cursor: pointer;
  }
`;

/**
 * Clickable header for collapsed plan messages.
 * Shows "{planName} Updated" with an expand/collapse indicator.
 */
export const PlanMessageHeader = styled.div`
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  padding: 2px 0;
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
