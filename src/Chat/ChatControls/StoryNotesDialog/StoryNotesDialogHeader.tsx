import React from "react";

interface StoryNotesDialogHeaderProps {
  onCancel: () => void;
}

export const StoryNotesDialogHeader: React.FC<StoryNotesDialogHeaderProps> = ({
  onCancel,
}) => {
  return (
    <div className="chat-settings-header">
      <h2>Story Notes Templates</h2>
      <button className="chat-settings-close" onClick={onCancel}>
        ×
      </button>
    </div>
  );
};
