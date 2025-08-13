import React from "react";
import "./NoteItem.css";
import type { Note } from "../../../models";

interface NoteItemProps {
  note: Note;
}

export const NoteItem: React.FC<NoteItemProps> = ({ note }) => {
  return (
    <div className="note-item-card">
      <div className="note-item-header">
        <h3>{note.name}</h3>
      </div>
      <div className="note-item-content">
        <p>{note.content}</p>
      </div>
    </div>
  );
};
