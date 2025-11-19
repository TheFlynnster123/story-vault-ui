import "./MessageOverlay.css";
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
    <div className="message-overlay" onClick={onBackdropClick}>
      <div
        className="message-overlay-content"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
