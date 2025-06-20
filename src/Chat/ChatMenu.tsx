import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { ChatHistoryAPI } from "../clients/ChatHistoryAPI";
import { v4 as uuidv4 } from "uuid";
import { Chat } from "./Chat";
import "./ChatMenu.css"; // Import the CSS file

function ChatMenu() {
  const { getAccessTokenSilently } = useAuth0(); // Get access token function
  const [chatIds, setChatIds] = useState<string[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<boolean>(true); // Default showMenu to true

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const accessToken = await getAccessTokenSilently();
        const chatHistoryAPI = new ChatHistoryAPI(accessToken);
        const fetchedChatIds = await chatHistoryAPI.getChats();
        setChatIds(fetchedChatIds);
      } catch (error) {
        console.error("Failed to fetch chats or get access token:", error);
      }
    };

    fetchChats();
  }, [getAccessTokenSilently]); // Add getAccessTokenSilently to dependency array

  const handleSelectChat = (id: string) => {
    setSelectedChatId(id);
    setShowMenu(false);
  };

  const handleCreateChat = () => {
    const newChatId = uuidv4();
    setSelectedChatId(newChatId);
    setShowMenu(false);
  };

  const toggleMenu = () => {
    setShowMenu((prevShowMenu) => !prevShowMenu);
  };

  if (!selectedChatId || showMenu) {
    return (
      <div className="chat-menu-container">
        <h2>Chats</h2>
        <div className="chat-menu-list">
          {chatIds.map((id) => (
            <div
              key={id}
              className="chat-menu-item"
              onClick={() => handleSelectChat(id)}
            >
              {id}
            </div>
          ))}
          <div
            key="create"
            className="chat-menu-create-item"
            onClick={handleCreateChat}
          >
            Create New Chat
          </div>
        </div>
      </div>
    );
  }

  // If a chat is selected and showMenu is false, render the Chat component
  // The user's version passes toggleMenu to Chat. I'll keep that.
  // Adding a button here to show the menu again.
  return <Chat chatId={selectedChatId} toggleMenu={toggleMenu} />;
}

export default ChatMenu;
