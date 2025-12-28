import {
  MessageOverlayContainer,
  MessageOverlayContent,
} from "./MessageOverlay.styled";
import type { ReactNode } from "react";

interface MessageOverlayProps {
  show: boolean;
  children: ReactNode;
  onBackdropClick: () => void;
}

export const MessageOverlay: React.FC<MessageOverlayProps> = ({
  show,
  children,
  onBackdropClick,
}) => {
  if (!show) return null;

  return (
    <MessageOverlayContainer onClick={onBackdropClick}>
      <MessageOverlayContent onClick={(e) => e.stopPropagation()}>
        {children}
      </MessageOverlayContent>
    </MessageOverlayContainer>
  );
};
