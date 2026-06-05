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
            gradientIndex={getGradientIndex(chatId)}
          />
        );
      })}
    </StyledChatList>
  );
};

const getGradientIndex = (chatId: string): number =>
  [...chatId].reduce((sum, char) => sum + char.charCodeAt(0), 0);

const StyledChatList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 40vh));
  gap: 16px;
  justify-content: center;
  align-items: start;
  width: 100%;
  padding-bottom: 20px;
`;
