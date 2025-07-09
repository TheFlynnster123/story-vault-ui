import type { ChatSettings } from "../../models";

interface ChatSettingsMap {
  [chatId: string]: ChatSettings | undefined;
}

interface IChatListItemProps {
  chatId: string;
  chatSettings: ChatSettingsMap;
  onClick: () => any;
}

export const ChatListItem = ({
  chatId,
  chatSettings,
  onClick,
}: IChatListItemProps) => {
  const currentChatSettings = chatSettings[chatId];
  const hasBackgroundImage = currentChatSettings?.backgroundPhotoBase64;
  const title = currentChatSettings?.chatTitle ?? chatId;

  return (
    <div
      key={chatId}
      className={`chat-menu-item ${
        hasBackgroundImage ? "chat-menu-item-with-image" : ""
      }`}
      onClick={() => onClick()}
      style={
        hasBackgroundImage ? getBackgroundImageStyles(currentChatSettings) : {}
      }
    >
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
