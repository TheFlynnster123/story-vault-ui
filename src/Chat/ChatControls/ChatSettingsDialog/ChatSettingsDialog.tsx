import React, { useState, useEffect } from "react";
import type { ChatSettings } from "../../../models/ChatSettings";
import "./ChatSettingsDialog.css";

interface ChatSettingsDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onCreate: (settings: ChatSettings) => void;
  initialValues?: Partial<ChatSettings>;
}

export const ChatSettingsDialog: React.FC<ChatSettingsDialogProps> = ({
  isOpen,
  onCancel,
  onCreate,
  initialValues,
}) => {
  const [chatTitle, setChatTitle] = useState("");
  const [context, setContext] = useState("");
  const [backgroundPhotoBase64, setBackgroundPhotoBase64] = useState<
    string | undefined
  >(undefined);
  const [errors, setErrors] = useState<{
    chatTitle?: string;
    context?: string;
  }>({});

  // Auto-fill form with initial values when dialog opens
  useEffect(() => {
    if (isOpen && initialValues) {
      setChatTitle(initialValues.chatTitle || "");
      setContext(initialValues.context || "");
      setBackgroundPhotoBase64(initialValues.backgroundPhotoBase64);
      setErrors({});
    }
  }, [isOpen, initialValues]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        setBackgroundPhotoBase64(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setBackgroundPhotoBase64(undefined);
  };

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
        backgroundPhotoBase64,
      });
      // Reset form
      setChatTitle("");
      setContext("");
      setBackgroundPhotoBase64(undefined);
      setErrors({});
    }
  };

  const handleCancel = () => {
    // Reset form
    setChatTitle("");
    setContext("");
    setBackgroundPhotoBase64(undefined);
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
          <h2>{initialValues ? "Edit Chat Settings" : "Create New Chat"}</h2>
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

          <div className="chat-settings-field">
            <label htmlFor="background-photo">Background Photo</label>
            <div className="photo-upload-container">
              {backgroundPhotoBase64 ? (
                <div className="photo-preview">
                  <img
                    src={backgroundPhotoBase64}
                    alt="Background preview"
                    className="photo-preview-image"
                  />
                  <button
                    type="button"
                    className="photo-remove-button"
                    onClick={removePhoto}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="photo-upload-area">
                  <input
                    id="background-photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="photo-upload-input"
                  />
                  <label
                    htmlFor="background-photo"
                    className="photo-upload-label"
                  >
                    <div>Choose Image</div>
                    <small>Max 5MB, JPG/PNG/GIF</small>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="chat-settings-actions">
          <button className="chat-settings-cancel" onClick={handleCancel}>
            Cancel
          </button>
          <button className="chat-settings-create" onClick={handleCreate}>
            {initialValues ? "Save Changes" : "Create Chat"}
          </button>
        </div>
      </div>
    </div>
  );
};
