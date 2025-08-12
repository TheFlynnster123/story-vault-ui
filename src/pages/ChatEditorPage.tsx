import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";
import { RiArrowLeftLine } from "react-icons/ri";
import type { ChatSettings } from "../models/ChatSettings";
import { useChatSettings } from "../hooks/queries/useChatSettings";
import { ChatDeleteControl } from "../Chat/ChatControls/ChatDeleteControl";
import { v4 as uuidv4 } from "uuid";

export const ChatEditorPage: React.FC = () => {
  const { id: chatId } = useParams();
  const navigate = useNavigate();
  const { chatSettings, saveChatSettings } = useChatSettings(chatId ?? "");

  const [chatTitle, setChatTitle] = useState("");
  const [context, setContext] = useState("");
  const [backgroundPhotoBase64, setBackgroundPhotoBase64] = useState<
    string | undefined
  >(undefined);
  const [errors, setErrors] = useState<{
    chatTitle?: string;
    context?: string;
  }>({});

  useEffect(() => {
    if (chatSettings) {
      setChatTitle(chatSettings.chatTitle || "");
      setContext(chatSettings.context || "");
      setBackgroundPhotoBase64(chatSettings.backgroundPhotoBase64);
    }
  }, [chatSettings]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
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
    if (!chatTitle.trim()) newErrors.chatTitle = "Story title is required";
    if (!context.trim()) newErrors.context = "First message is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      const settingsToSave: ChatSettings = {
        chatTitle: chatTitle.trim(),
        context: context.trim(),
        backgroundPhotoBase64,
      };

      const newChatId = chatId || uuidv4();
      await saveChatSettings(settingsToSave);
      navigate(`/chat/${newChatId}`);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <PageContainer>
      <Header>
        <BackButton onClick={handleGoBack} aria-label="Go back">
          <RiArrowLeftLine />
        </BackButton>
        <Title>{chatId ? "Edit Chat" : "Create New Chat"}</Title>
      </Header>

      <Content>
        <SettingsSection>
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
        </SettingsSection>
      </Content>

      <Footer>
        {chatId && (
          <ChatDeleteControl
            chatId={chatId}
            onDeleteSuccess={() => navigate("/chat")}
          />
        )}
        <div className="chat-settings-primary-actions">
          <button className="chat-settings-cancel" onClick={handleGoBack}>
            Cancel
          </button>
          <button className="chat-settings-create" onClick={handleSubmit}>
            {chatId ? "Save Changes" : "Create Chat"}
          </button>
        </div>
      </Footer>
    </PageContainer>
  );
};

const PageContainer = styled.div`
  min-height: 100vh;
  background-color: #0f0f0f;
  color: white;
  padding: 20px;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid #333;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #999;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
`;

const Content = styled.div`
  flex-grow: 1;
  overflow-y: auto;
`;

const SettingsSection = styled.div`
  background-color: #1a1a1a;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #333;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid #333;
`;
