import { useNavigate } from "react-router-dom";
import { SystemSettingsButton } from "./ChatMenu/SystemSettingsButton";
import { ImageSettingsButton } from "./ChatMenu/ImageSettingsButton";
import { CreateChatButton } from "./ChatMenu/CreateChatButton";
import { ChatList } from "./ChatMenu/ChatList";
import styled from "styled-components";
import { useChats } from "../hooks/useChats";
import { useEffect, useState } from "react";
import { d } from "../app/Dependencies/Dependencies";

const ChatMenuPage = () => {
  const navigate = useNavigate();
  const { chatIds, isLoading: isLoadingChats } = useChats();
  const [sortedChatIds, setSortedChatIds] = useState<string[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  useEffect(() => {
    if (isLoadingChats) return;

    const loadAndSortChats = async () => {
      try {
        setIsLoadingRecent(true);
        setSortedChatIds(await d.RecentChatsService().sortByRecency(chatIds));
      } catch (error) {
        d.ErrorService().log("Failed to load recent chats:", error);
        setSortedChatIds(chatIds);
      } finally {
        setIsLoadingRecent(false);
      }
    };

    loadAndSortChats();
  }, [chatIds, isLoadingChats]);

  const handleSelectChat = (id: string) => {
    d.RecentChatsService().recordNavigation(id);
    navigate(`/chat/${id}`);
  };

  const isLoading = isLoadingChats || isLoadingRecent;

  return (
    <>
      <ChatMenuContainer>
        <ChatMenuHeader>
          <ChatMenuTitle>Chats</ChatMenuTitle>
          <SystemSettingsContainer>
            <SystemSettingsButton />
            <ImageSettingsButton />
          </SystemSettingsContainer>
        </ChatMenuHeader>
        <CreateChatButton />
        {isLoading ? (
          <LoadingText>Loading chats...</LoadingText>
        ) : (
          <ChatList
            chatIds={sortedChatIds}
            handleSelectChat={handleSelectChat}
          />
        )}
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
  gap: 8px;
`;

const LoadingText = styled.p`
  color: white;
  font-size: 1em;
  margin-top: 20px;
`;

export default ChatMenuPage;
