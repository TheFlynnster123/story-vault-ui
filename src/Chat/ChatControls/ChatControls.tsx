import React, { useState } from "react";
import {
  RiArrowGoBackLine,
  RiChatSettingsLine,
  RiFileList2Line,
} from "react-icons/ri";
import "./ChatControls.css";
import { useNavigate } from "react-router-dom";

interface ChatControlsProps {
  chatId: string;
  toggleMenu: () => void;
  toggleChatFlowDialog: () => void;
}

export const ChatControls: React.FC<ChatControlsProps> = ({
  chatId,
  toggleMenu,
}) => {
  const [isStoryNotesDialogOpen, setIsStoryNotesDialogOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="chat-controls">
      <button
        className="chat-controls-button menu-button"
        onClick={toggleMenu}
        title="Back to Menu"
      >
        <RiArrowGoBackLine />
      </button>

      <button
        className="chat-controls-button settings-button"
        onClick={() => navigate(`/chat/${chatId}/edit`)}
        title="Chat Settings"
      >
        <RiChatSettingsLine />
      </button>

      <button
        className="chat-controls-button story-notes-button"
        onClick={() => navigate(`/chat/${chatId}/notes`)}
        title="Story Notes"
      >
        <RiFileList2Line />
      </button>
    </div>
  );
};
