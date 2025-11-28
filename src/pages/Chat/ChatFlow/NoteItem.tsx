import React from "react";
import {
  NoteItemCard,
  NoteItemHeader,
  NoteItemContent,
} from "./NoteItem.styled";
import type { Note } from "../../../models";

interface NoteItemProps {
  note: Note;
}

export const NoteItem: React.FC<NoteItemProps> = ({ note }) => {
  return (
    <NoteItemCard>
      <NoteItemHeader>
        <h3>{note.name}</h3>
      </NoteItemHeader>
      <NoteItemContent>
        <p>{note.content}</p>
      </NoteItemContent>
    </NoteItemCard>
  );
};
