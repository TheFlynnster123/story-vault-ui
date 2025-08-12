import { useNavigate } from "react-router-dom";
import { useChats } from "./Menu/useChats";
import { SystemSettingsButton } from "./Menu/SystemSettingsButton";
import { CreateChatButton } from "./Menu/CreateChatButton";
import { ChatList } from "./Menu/ChatList";
import styled from "styled-components";

const ChatMenuPage = () => {
  const navigate = useNavigate();
  const { chatIds } = useChats();

  const handleSelectChat = (id: string) => {
    navigate(`/chat/${id}`);
  };

  return (
    <>
      <ChatMenuContainer>
        <ChatMenuHeader>
          <ChatMenuTitle>Chats</ChatMenuTitle>
          <SystemSettingsContainer>
            <SystemSettingsButton />
          </SystemSettingsContainer>
        </ChatMenuHeader>
        <CreateChatButton />
        <ChatList chatIds={chatIds} handleSelectChat={handleSelectChat} />
      </ChatMenuContainer>
    </>
  );
};

const ChatMenuContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  height: 100vh;
  overflow-y: auto;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const ChatMenuHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 15px;
`;

const ChatMenuTitle = styled.h2`
  margin: 0;
  font-size: 1.4em;
  color: white;
  text-align: center;
  flex: 1;
`;

const SystemSettingsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export default ChatMenuPage;
