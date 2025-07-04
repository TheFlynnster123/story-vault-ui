import React from "react";
import "./LoadingSpinner.css";

interface LoadingSpinnerProps {
  message?: string;
  containerClassName?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
  containerClassName = "loading-spinner-container",
}) => (
  <div className={containerClassName}>
    <div className="loading-spinner"></div>
    {message && <div className="loading-message">{message}</div>}
  </div>
);

export const ChatLoadingSpinner: React.FC = () => (
  <div className="chat-container">
    <LoadingSpinner message="Loading chat..." />
  </div>
);
