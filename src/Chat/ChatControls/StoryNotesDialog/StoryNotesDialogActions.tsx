import React from "react";

interface StoryNotesDialogActionsProps {
  onCancel: () => void;
  onSave: () => void;
}

export const StoryNotesDialogActions: React.FC<
  StoryNotesDialogActionsProps
> = ({ onCancel, onSave }) => {
  return (
    <div className="chat-settings-actions">
      <button className="chat-settings-cancel" onClick={onCancel}>
        Cancel
      </button>
      <button className="chat-settings-create" onClick={onSave}>
        Save
      </button>
    </div>
  );
};
