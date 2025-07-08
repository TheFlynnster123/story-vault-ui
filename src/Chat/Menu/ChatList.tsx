import type { ChatSettings } from "../../models";
import { ChatListItem } from "./ChatListItem";

interface ChatSettingsMap {
  [chatId: string]: ChatSettings | null;
}

interface IChatListProps {
  chatIds: string[];
  chatSettings: ChatSettingsMap;
  handleSelectChat: (id: string) => void;
}

export const ChatList = ({
  chatIds,
  chatSettings,
  handleSelectChat,
}: IChatListProps) => {
  return (
    <div className="chat-menu-list">
      {chatIds.map((chatId) => {
        return (
          <ChatListItem
            chatId={chatId}
            chatSettings={chatSettings}
            onClick={() => handleSelectChat(chatId)}
            key={"ChatPreview-" + chatId}
          />
        );
      })}
    </div>
  );
};
