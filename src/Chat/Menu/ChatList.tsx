import type { ChatSettings } from "../../models";
import { ChatListItem } from "./ChatListItem";

interface IChatListProps {
  chatIds: string[];
  handleSelectChat: (id: string) => void;
}

export const ChatList = ({ chatIds, handleSelectChat }: IChatListProps) => {
  return (
    <div className="chat-menu-list">
      {chatIds.map((chatId) => {
        return (
          <ChatListItem
            chatId={chatId}
            onClick={() => handleSelectChat(chatId)}
            key={"ChatPreview-" + chatId}
          />
        );
      })}
    </div>
  );
};
