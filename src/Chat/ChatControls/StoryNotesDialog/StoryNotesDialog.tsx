import React, { useState, useEffect } from "react";
import { RiAddLine } from "react-icons/ri";
import "./StoryNotesDialog.css";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { StoryNotesDialogHeader, StoryNotesDialogActions } from "./index";
import type { Note } from "../../../models";
import { useNotes } from "../../../hooks/useNotes";
import { v4 as uuidv4 } from "uuid";
import { NoteList } from "./NoteList";

interface StoryNotesDialogProps {
  chatId: string;
  isOpen: boolean;
  onCancel: () => void;
}

export const StoryNotesDialog: React.FC<StoryNotesDialogProps> = ({
  chatId,
  isOpen,
  onCancel,
}) => {
  const { notes: initialNotes, saveNotes, isLoading } = useNotes(chatId);
  const [localNotes, setLocalNotes] = useState<Note[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const prevIsOpen = React.useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpen.current && !isLoading) {
      setLocalNotes([...initialNotes]);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, isLoading, initialNotes]);

  const handleAddNote = (type: Note["type"]) => {
    const newNote: Note = {
      id: uuidv4(),
      type,
      name: `New ${type} Note`,
      requestPrompt: "",
      updatePrompt: "",
      content: "",
    };
    setLocalNotes([...localNotes, newNote]);
  };

  const handleNoteChange = (id: string, field: keyof Note, value: string) => {
    setLocalNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, [field]: value } : note))
    );
  };

  const handleRemoveNote = (id: string) => {
    setNoteToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const confirmRemoveNote = () => {
    if (noteToDelete) {
      setLocalNotes((prev) => prev.filter((note) => note.id !== noteToDelete));
    }
    setIsConfirmModalOpen(false);
    setNoteToDelete(null);
  };

  const handleSave = async () => {
    await saveNotes(localNotes);
    onCancel();
  };

  const getNotesByType = (type: Note["type"]) =>
    localNotes.filter((note) => note.type === type);

  return (
    isOpen && (
      <div className="chat-settings-overlay">
        <div className="chat-settings-dialog">
          <StoryNotesDialogHeader onCancel={onCancel} />
          <div
            className="chat-settings-content"
            style={{ overflowY: "auto", maxHeight: "70vh" }}
          >
            <NoteSection
              title="Planning Notes"
              type="planning"
              notes={getNotesByType("planning")}
              onAdd={handleAddNote}
              onChange={handleNoteChange}
              onRemove={handleRemoveNote}
            />
            <NoteSection
              title="Refinement Notes"
              type="refinement"
              notes={getNotesByType("refinement")}
              onAdd={handleAddNote}
              onChange={handleNoteChange}
              onRemove={handleRemoveNote}
            />
            <NoteSection
              title="Analysis Notes"
              type="analysis"
              notes={getNotesByType("analysis")}
              onAdd={handleAddNote}
              onChange={handleNoteChange}
              onRemove={handleRemoveNote}
            />
          </div>
          <StoryNotesDialogActions onCancel={onCancel} onSave={handleSave} />
        </div>
        <ConfirmModal
          isOpen={isConfirmModalOpen}
          onCancel={() => setIsConfirmModalOpen(false)}
          onConfirm={confirmRemoveNote}
          title="Confirm Deletion"
          message="Are you sure you want to delete this note?"
        />
      </div>
    )
  );
};

interface NoteSectionProps {
  title: string;
  type: Note["type"];
  notes: Note[];
  onAdd: (type: Note["type"]) => void;
  onChange: (id: string, field: keyof Note, value: string) => void;
  onRemove: (id: string) => void;
}

const NoteSection: React.FC<NoteSectionProps> = ({
  title,
  type,
  notes,
  onAdd,
  onChange,
  onRemove,
}) => (
  <div className="note-section">
    <h3>{title}</h3>
    <NoteList notes={notes} onNoteChange={onChange} onRemoveNote={onRemove} />
    <button className="story-notes-add-button" onClick={() => onAdd(type)}>
      <RiAddLine size={24} />
    </button>
  </div>
);
