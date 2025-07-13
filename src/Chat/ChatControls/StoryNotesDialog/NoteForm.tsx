import React, { useState } from "react";
import { RiArrowDownSLine, RiArrowUpSLine, RiCloseLine } from "react-icons/ri";
import "./NoteForm.css";
import type { Note } from "../../../models";

interface NoteFormProps {
  note: Note;
  onNoteChange: (
    id: string,
    field: "name" | "requestPrompt",
    value: string
  ) => void;
  onRemoveNote: (id: string) => void;
}

export const NoteForm: React.FC<NoteFormProps> = ({
  note,
  onNoteChange,
  onRemoveNote,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="note-form-container">
      <div className="note-form-header">
        <input
          type="text"
          value={note.name}
          onChange={(e) => onNoteChange(note.id, "name", e.target.value)}
          placeholder="Add a title for your note..."
          className="note-form-title-input"
          onClick={(e) => e.stopPropagation()}
        />
        <button className="note-form-collapse-button" onClick={toggleCollapse}>
          {isCollapsed ? <RiArrowDownSLine /> : <RiArrowUpSLine />}
        </button>
      </div>
      {!isCollapsed && (
        <div className="note-form-body">
          <button
            className="note-form-delete-button"
            onClick={() => onRemoveNote(note.id)}
          >
            <RiCloseLine />
          </button>
          <div className="note-form-field">
            <textarea
              id={`note-request-${note.id}`}
              value={note.requestPrompt}
              onChange={(e) =>
                onNoteChange(note.id, "requestPrompt", e.target.value)
              }
              rows={4}
              placeholder="Enter the request note..."
            />
          </div>
        </div>
      )}
    </div>
  );
};
