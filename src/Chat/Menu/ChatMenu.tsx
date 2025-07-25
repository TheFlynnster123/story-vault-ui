import { useState } from "react";
import { Chat } from "../Chat";
import { CreateChatButton } from "./CreateChatButton";
import "./ChatMenu.css";
import { ChatList } from "./ChatList";
import { SystemSettingsButton } from "./SystemSettingsButton";
import { useChats } from "./useChats";

function ChatMenu() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<boolean>(true);
  const { chatIds, refreshChats } = useChats();

  const handleSelectChat = (id: string) => {
    setSelectedChatId(id);
    setShowMenu(false);
  };

  const handleChatCreated = (newChatId: string) => {
    refreshChats();
    setSelectedChatId(newChatId);
    setShowMenu(false);
  };

  const toggleMenu = () => {
    setShowMenu((prevShowMenu) => !prevShowMenu);
  };

  if (selectedChatId && !showMenu) {
    return <Chat chatId={selectedChatId} toggleMenu={toggleMenu} />;
  }

  return (
    <>
      <div className="chat-menu-container">
        <div className="chat-menu-header">
          <h2>Chats</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <SystemSettingsButton />
          </div>
        </div>
        <CreateChatButton onChatCreated={handleChatCreated} />
        <ChatList chatIds={chatIds} handleSelectChat={handleSelectChat} />
      </div>
    </>
  );
}

export default ChatMenu;
