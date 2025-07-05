import React, { useState } from "react";
import type { ChatSettings } from "../models/ChatSettingsNote";
import "./ChatSettingsDialog.css";

interface ChatSettingsDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onCreate: (settings: ChatSettings) => void;
}

export const ChatSettingsDialog: React.FC<ChatSettingsDialogProps> = ({
  isOpen,
  onCancel,
  onCreate,
}) => {
  const [chatTitle, setChatTitle] = useState("");
  const [context, setContext] = useState("");
  const [errors, setErrors] = useState<{
    chatTitle?: string;
    context?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: { chatTitle?: string; context?: string } = {};

    if (!chatTitle.trim()) {
      newErrors.chatTitle = "Story title is required";
    }

    if (!context.trim()) {
      newErrors.context = "First message is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = () => {
    if (validateForm()) {
      onCreate({
        chatTitle: chatTitle.trim(),
        context: context.trim(),
      });
      // Reset form
      setChatTitle("");
      setContext("");
      setErrors({});
    }
  };

  const handleCancel = () => {
    // Reset form
    setChatTitle("");
    setContext("");
    setErrors({});
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chat-settings-overlay" onKeyDown={handleKeyDown}>
      <div className="chat-settings-dialog">
        <div className="chat-settings-header">
          <h2>Create New Chat</h2>
          <button className="chat-settings-close" onClick={handleCancel}>
            ×
          </button>
        </div>

        <div className="chat-settings-content">
          <div className="chat-settings-field">
            <label htmlFor="story-title">Story Title *</label>
            <input
              id="story-title"
              type="text"
              value={chatTitle}
              onChange={(e) => setChatTitle(e.target.value)}
              placeholder="Enter a title for your story..."
              className={errors.chatTitle ? "error" : ""}
              autoFocus
            />
            {errors.chatTitle && (
              <span className="error-message">{errors.chatTitle}</span>
            )}
          </div>

          <div className="chat-settings-field">
            <label htmlFor="context">First Message *</label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Enter the first message to start your story..."
              rows={4}
              className={errors.context ? "error" : ""}
            />
            {errors.context && (
              <span className="error-message">{errors.context}</span>
            )}
          </div>
        </div>

        <div className="chat-settings-actions">
          <button className="chat-settings-cancel" onClick={handleCancel}>
            Cancel
          </button>
          <button className="chat-settings-create" onClick={handleCreate}>
            Create Chat
          </button>
        </div>
      </div>
    </div>
  );
};
