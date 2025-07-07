import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { ChatHistoryAPI } from "../clients/ChatHistoryAPI";
import { v4 as uuidv4 } from "uuid";
import { Chat } from "./Chat";
import { ChatSettingsManager } from "./ChatSettingsManager";
import { SystemSettingsDialog } from "../SystemSettings";
import { RiSettings3Fill } from "react-icons/ri";
import "./ChatMenu.css";
import { useEncryption } from "../hooks/useEncryption";
import { useChatSettings } from "../hooks/useChatSettings";
import type { EncryptionManager } from "../Managers/EncryptionManager";

function ChatMenu() {
  const { getAccessTokenSilently } = useAuth0();
  const [chatIds, setChatIds] = useState<string[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<boolean>(true);
  const [showSystemSettings, setShowSystemSettings] = useState<boolean>(false);
  const { encryptionManager } = useEncryption();
  const { chatSettings, loadChatSettings, getChatTitle } = useChatSettings();

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const accessToken = await getAccessTokenSilently();
        const chatHistoryAPI = new ChatHistoryAPI(
          encryptionManager as EncryptionManager,
          accessToken
        );
        const fetchedChatIds = await chatHistoryAPI.getChats();
        setChatIds(fetchedChatIds);

        // Load settings for all chats
        await Promise.all(
          fetchedChatIds.map((chatId) => loadChatSettings(chatId))
        );
      } catch (error) {
        console.error("Failed to fetch chats or get access token:", error);
      }
    };

    if (encryptionManager) fetchChats();
  }, [getAccessTokenSilently, encryptionManager, loadChatSettings]);

  const handleSelectChat = (id: string) => {
    setSelectedChatId(id);
    setShowMenu(false);
  };

  const handleChatCreated = (newChatId: string) => {
    setChatIds((prev) => [...prev, newChatId]);
    setSelectedChatId(newChatId);
    setShowMenu(false);
  };

  const generateChatId = () => uuidv4();

  const toggleMenu = () => {
    setShowMenu((prevShowMenu) => !prevShowMenu);
  };

  if (!selectedChatId || showMenu) {
    return (
      <>
        <div className="chat-menu-container">
          <div className="chat-menu-header">
            <h2>Chats</h2>
            <button
              className="system-settings-button"
              onClick={() => setShowSystemSettings(true)}
              aria-label="Open system settings"
              title="System Settings"
            >
              <RiSettings3Fill />
            </button>
          </div>
          <ChatSettingsManager
            onChatCreated={handleChatCreated}
            generateChatId={generateChatId}
          />
          <div className="chat-menu-list">
            {chatIds.map((id) => {
              const currentChatSettings = chatSettings[id];
              const hasBackgroundImage =
                currentChatSettings?.backgroundPhotoBase64;

              return (
                <div
                  key={id}
                  className={`chat-menu-item ${
                    hasBackgroundImage ? "chat-menu-item-with-image" : ""
                  }`}
                  onClick={() => handleSelectChat(id)}
                  style={
                    hasBackgroundImage
                      ? {
                          backgroundImage: `url(${currentChatSettings.backgroundPhotoBase64})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }
                      : {}
                  }
                >
                  <div className="chat-menu-item-title">{getChatTitle(id)}</div>
                </div>
              );
            })}
          </div>
        </div>
        <SystemSettingsDialog
          isOpen={showSystemSettings}
          onClose={() => setShowSystemSettings(false)}
        />
      </>
    );
  }

  return <Chat chatId={selectedChatId} toggleMenu={toggleMenu} />;
}

export default ChatMenu;
