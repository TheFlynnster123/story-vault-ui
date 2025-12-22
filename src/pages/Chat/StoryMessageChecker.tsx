import React, { useState, useEffect } from "react";
import { d } from "../../app/Dependencies/Dependencies";
import { useChatSettings } from "../../queries/chat-settings/useChatSettings";
import { useUserChatProjection } from "../../hooks/useUserChatProjection";
import {
  Overlay,
  Dialog,
  Header,
  CloseButton,
  Content,
  Actions,
  ConfirmButton,
} from "./StoryMessageChecker.styled";

interface StoryMessageCheckerProps {
  chatId: string;
}

export const StoryMessageChecker: React.FC<StoryMessageCheckerProps> = ({
  chatId,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [storyText, setStoryText] = useState("");
  const { chatSettings } = useChatSettings(chatId);
  const { messages } = useUserChatProjection(chatId);

  useEffect(() => {
    const checkForStoryMessage = async () => {
      // Check if there are messages
      const hasMessages = messages.length > 0;

      // Check if there's already a story message
      const hasStoryMessage = messages.some((m) => m.type === "story");

      // If has messages but no story message, show the modal
      if (hasMessages && !hasStoryMessage) {
        // Pre-fill with chatSettings.story if it exists (backwards compatibility)
        console.log(chatSettings);
        const legacyStory = (chatSettings as any)?.story;
        if (legacyStory) {
          setStoryText(legacyStory);
        }
        setIsModalOpen(true);
      }
    };

    checkForStoryMessage();
  }, [messages, chatSettings]);

  const handleConfirm = async () => {
    if (storyText.trim()) {
      await d.ChatService(chatId).InitializeStory(storyText.trim());
    }
    setIsModalOpen(false);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  if (!isModalOpen) return null;

  return (
    <Overlay>
      <Dialog>
        <Header>
          <h2>Add Story Description</h2>
          <CloseButton onClick={handleClose}>×</CloseButton>
        </Header>

        <Content>
          <p>
            Please add a description of your story. This helps provide context
            for the conversation.
          </p>
          <textarea
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            placeholder="Enter your story description..."
            rows={8}
          />
        </Content>

        <Actions>
          <ConfirmButton onClick={handleConfirm} disabled={!storyText.trim()}>
            Add Story
          </ConfirmButton>
        </Actions>
      </Dialog>
    </Overlay>
  );
};
