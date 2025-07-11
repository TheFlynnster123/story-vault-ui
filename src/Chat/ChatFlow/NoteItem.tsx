import React from "react";
import type { Note } from "../../models/Note";
import "./NoteItem.css";

interface NoteItemProps {
  note: Note;
}

export const NoteItem: React.FC<NoteItemProps> = ({ note }) => {
  return (
    <div className="note-item-card">
      <div className="note-item-header">
        <h3>{note.template.name}</h3>
      </div>
      <div className="note-item-content">
        <p>{note.content}</p>
      </div>
    </div>
  );
};
