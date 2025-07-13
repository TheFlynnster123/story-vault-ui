import { useChatSettings } from "../../hooks/queries/useChatSettings";
import type { ChatSettings } from "../../models";

interface IChatListItemProps {
  chatId: string;
  onClick: () => any;
}

export const ChatListItem = ({ chatId, onClick }: IChatListItemProps) => {
  const { chatSettings, isLoading } = useChatSettings(chatId);
  const hasBackgroundImage = chatSettings?.backgroundPhotoBase64;
  const title = chatSettings?.chatTitle ?? chatId;

  if (isLoading) {
    return (
      <div key={chatId} className="chat-menu-item">
        <div className="chat-menu-item-title">Loading...</div>
      </div>
    );
  }

  if (hasBackgroundImage) {
    return (
      <div
        key={chatId}
        className="chat-menu-item chat-menu-item-with-image"
        onClick={() => onClick()}
        style={getBackgroundImageStyles(chatSettings)}
      >
        <div className="chat-menu-item-title">{title}</div>
      </div>
    );
  }

  return (
    <div key={chatId} className="chat-menu-item" onClick={() => onClick()}>
      <div className="chat-menu-item-title">{title}</div>
    </div>
  );
};

const getBackgroundImageStyles = (currentChatSettings: ChatSettings) => ({
  backgroundImage: `url(${currentChatSettings.backgroundPhotoBase64})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
});
