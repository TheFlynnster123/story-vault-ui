import { useState } from "react";
import { Chat } from "../Chat";
import { ChatV2 } from "../ChatV2";
import { CreateChatButton } from "./CreateChatButton";
import "./ChatMenu.css";
import { ChatList } from "./ChatList";
import { SystemSettingsButton } from "./SystemSettingsButton";
import { useChats } from "./useChats";

function ChatMenuV2() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<boolean>(true);
  const [useV2ChatFlow, setUseV2ChatFlow] = useState<boolean>(false);
  const { chatIds, chatSettings, refreshChats } = useChats();

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
    return useV2ChatFlow ? (
      <ChatV2 chatId={selectedChatId} toggleMenu={toggleMenu} />
    ) : (
      <Chat chatId={selectedChatId} toggleMenu={toggleMenu} />
    );
  }

  return (
    <>
      <div className="chat-menu-container">
        <div className="chat-menu-header">
          <h2>Chats</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label
              style={{
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <input
                type="checkbox"
                checked={useV2ChatFlow}
                onChange={(e) => setUseV2ChatFlow(e.target.checked)}
              />
              Use ChatFlow v2
            </label>
            <SystemSettingsButton />
          </div>
        </div>
        <CreateChatButton onChatCreated={handleChatCreated} />
        <ChatList
          chatIds={chatIds}
          chatSettings={chatSettings}
          handleSelectChat={handleSelectChat}
        />

        {/* Info about ChatFlow versions */}
        <div
          style={{
            margin: "16px",
            padding: "12px",
            backgroundColor: "#f3f4f6",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#6b7280",
          }}
        >
          <strong>ChatFlow v2 Features:</strong>
          <ul style={{ margin: "8px 0", paddingLeft: "16px" }}>
            <li>Zustand state machine</li>
            <li>Configurable prompts</li>
            <li>Refinement step with feedback</li>
            <li>Enhanced analysis notes</li>
            <li>Better error handling</li>
          </ul>
        </div>
      </div>
    </>
  );
}

export default ChatMenuV2;
