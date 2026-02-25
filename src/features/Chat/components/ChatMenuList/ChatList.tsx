import styled from "styled-components";
import { ChatListItem } from "./ChatListItem";

interface IChatListProps {
  chatIds: string[];
  handleSelectChat: (id: string) => void;
}

export const ChatList = ({ chatIds, handleSelectChat }: IChatListProps) => {
  return (
    <StyledChatList>
      {chatIds.map((chatId) => {
        return (
          <ChatListItem
            chatId={chatId}
            onClick={() => handleSelectChat(chatId)}
            key={"ChatPreview-" + chatId}
          />
        );
      })}
    </StyledChatList>
  );
};

const StyledChatList = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding-bottom: 20px;
`;
