import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RiArrowLeftLine, RiAddLine } from "react-icons/ri";
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
import { useForm } from "@mantine/form";
import type { Note } from "../models/Note";
import { useNotes } from "../hooks/useNotes";
import { v4 as uuidv4 } from "uuid";
import { ConfirmModal } from "../components/ConfirmModal";

export const StoryNotesPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { notes: initialNotes, saveNotes, isLoading } = useNotes(chatId!);
  const [localNotes, setLocalNotes] = useState<Note[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setLocalNotes([...initialNotes]);
    }
  }, [isLoading, initialNotes]);

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
    navigate(`/chat/${chatId}`);
  };

  const handleGoBack = () => {
    navigate(`/chat/${chatId}`);
  };

  const getNotesByType = (type: Note["type"]) =>
    localNotes.filter((note) => note.type === type);

  return (
    <Container size="md" my="xl">
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Group justify="space-between" align="center" mb="xl">
          <ActionIcon onClick={handleGoBack} variant="default" size="lg">
            <RiArrowLeftLine />
          </ActionIcon>
          <Title order={2}>Story Notes</Title>
        </Group>

        <Stack>
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
        </Stack>

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={handleGoBack}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </Group>
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
          label="Request Prompt"
          value={note.requestPrompt}
          onChange={(e) =>
            onChange(note.id, "requestPrompt", e.currentTarget.value)
          }
          minRows={2}
        />
        <Textarea
          label="Update Prompt"
          value={note.updatePrompt}
          onChange={(e) =>
            onChange(note.id, "updatePrompt", e.currentTarget.value)
          }
          minRows={2}
        />
        <Textarea
          label="Content"
          value={note.content}
          onChange={(e) => onChange(note.id, "content", e.currentTarget.value)}
          minRows={4}
        />
        <Button
          variant="outline"
          color="red"
          onClick={() => onRemove(note.id)}
          mt="sm"
        >
          Delete Note
        </Button>
      </Paper>
    ))}
  </Stack>
);
