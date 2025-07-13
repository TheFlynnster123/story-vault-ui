import React from "react";
import { NoteForm } from "./NoteForm";
import "./NoteList.css";
import type { Note } from "../../../models";

interface NoteListProps {
  notes: Note[];
  onNoteChange: (
    id: string,
    field: "name" | "requestPrompt",
    value: string
  ) => void;
  onRemoveNote: (id: string) => void;
}

export const NoteList: React.FC<NoteListProps> = ({
  notes,
  onNoteChange,
  onRemoveNote,
}) => {
  return (
    <ul className="story-notes-note-list">
      {notes.map((note) => (
        <li key={note.id} className="story-notes-note-list-item">
          <NoteForm
            note={note}
            onNoteChange={onNoteChange}
            onRemoveNote={onRemoveNote}
          />
        </li>
      ))}
    </ul>
  );
};
