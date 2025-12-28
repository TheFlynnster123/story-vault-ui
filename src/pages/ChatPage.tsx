import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { ChatInput } from "../components/Chat/ChatInput";
import { ChatEntriesList } from "../components/Chat/ChatEntriesList";
import { ChatControls } from "../components/Chat/ChatControls/ChatControls";
import { FlowAccordion } from "../components/Chat/Flow/FlowAccordion";
import { StoryMessageChecker } from "../components/Chat/ChatEntries/StoryMessageChecker";
import { useChatSettings } from "../components/Chat/useChatSettings";
import { useEnsureChatInitialization } from "../components/Chat/useEnsureChatInitialization";

const ChatPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();

  useEnsureChatInitialization(chatId ?? "");

  const { backgroundPhotoBase64 } = useChatSettings(chatId ?? "");

  if (!chatId) {
    navigate("/chat");
    return null;
  }

  return (
    <ChatContainer
      $chatId={chatId}
      $backgroundPhotoBase64={backgroundPhotoBase64}
    >
      <StoryMessageChecker chatId={chatId} />

      <ChatControls />

      <ChatEntriesList chatId={chatId} />

      <FlowAccordion chatId={chatId} />

      <ChatInput chatId={chatId} />
    </ChatContainer>
  );
};

const ChatContainer = styled.div.attrs<{
  $chatId: string;
}>((props) => ({
  "data-chatid": props.$chatId,
  className: "chat-container",
}))<{
  $backgroundPhotoBase64?: string;
}>`
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;

  flex: 1;
  min-height: 0;

  background-color: ${(props) =>
    props.$backgroundPhotoBase64 ? "transparent" : "black"};
  background-image: ${(props) =>
    props.$backgroundPhotoBase64
      ? `url(${props.$backgroundPhotoBase64})`
      : "none"};
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
`;

export default ChatPage;
