import React from "react";
import { RiCloseLine } from "react-icons/ri";

interface StoryNotesDialogHeaderProps {
  onCancel: () => void;
}

export const StoryNotesDialogHeader: React.FC<StoryNotesDialogHeaderProps> = ({
  onCancel,
}) => {
  return (
    <div className="chat-settings-header">
      <h2>Story Notes</h2>
      <button className="chat-settings-close" onClick={onCancel}>
        <RiCloseLine />
      </button>
    </div>
  );
};
