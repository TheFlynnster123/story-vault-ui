import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RiArrowLeftLine, RiAddLine, RiDeleteBinLine } from "react-icons/ri";
import {
  Container,
  Title,
  Button,
  Group,
  Paper,
  ActionIcon,
  Stack,
  TextInput,
  Textarea,
  Text,
} from "@mantine/core";
import type { Note } from "../models/Note";
import { useNotes } from "../hooks/useNotes";
import { v4 as uuidv4 } from "uuid";
import { ConfirmModal } from "../components/ConfirmModal";
import isEqual from "lodash.isequal";

export const StoryNotesPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { notes: initialNotes, saveNotes, isLoading } = useNotes(chatId!);
  const [localNotes, setLocalNotes] = useState<Note[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setLocalNotes([...initialNotes]);
    }
  }, [isLoading]);

  useEffect(() => {
    setIsDirty(!isEqual(initialNotes, localNotes));
  }, [localNotes, initialNotes]);

  const handleAddNote = (type: Note["type"]) => {
    const newNote: Note = {
      id: uuidv4(),
      type,
      name: `New Note`,
      prompt: "Write a list of key points relevant to the story:",
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
    navigate(`/chat/${chatId}`);
  };

  const handleGoBack = () => {
    navigate(`/chat/${chatId}`);
  };

  const getNotesByType = (type: Note["type"]) =>
    localNotes.filter((note) => note.type === type);

  return (
    <Container size="md" miw="70vw" my="xl">
      <Paper
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <StoryNotesHeader onGoBack={handleGoBack} isDirty={isDirty} />

        <Stack>
          <NoteSection
            title="Planning Notes"
            type="planning"
            notes={getNotesByType("planning")}
            onAdd={handleAddNote}
            onChange={handleNoteChange}
            onRemove={handleRemoveNote}
          />
        </Stack>
      </Paper>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmRemoveNote}
        title="Confirm Deletion"
        message="Are you sure you want to delete this note?"
      />
    </Container>
  );
};

interface StoryNotesHeaderProps {
  onGoBack: () => void;
  isDirty: boolean;
}

const StoryNotesHeader: React.FC<StoryNotesHeaderProps> = ({
  onGoBack,
  isDirty,
}) => (
  <Group justify="space-between" align="center" mb="xl">
    <Group>
      <ActionIcon onClick={onGoBack} variant="gradient" size="lg">
        <RiArrowLeftLine />
      </ActionIcon>
      <Title order={2}>Story Notes</Title>
    </Group>
    <Button type="submit" disabled={!isDirty}>
      Save Changes
    </Button>
  </Group>
);

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
  <Stack>
    <Group justify="space-between">
      <Text fw={500}>{title}</Text>
      <Button variant="subtle" onClick={() => onAdd(type)}>
        <RiAddLine /> Add Note
      </Button>
    </Group>
    {notes.map((note) => (
      <Paper key={note.id} withBorder p="md">
        <TextInput
          label="Name"
          value={note.name}
          onChange={(e) => onChange(note.id, "name", e.currentTarget.value)}
        />
        <Textarea
          label="Note Prompt"
          value={note.prompt}
          onChange={(e) => onChange(note.id, "prompt", e.currentTarget.value)}
          minRows={5}
        />
        <Button
          variant="outline"
          color="red"
          onClick={() => onRemove(note.id)}
          mt="sm"
        >
          <RiDeleteBinLine /> Delete Note
        </Button>
      </Paper>
    ))}
  </Stack>
);
