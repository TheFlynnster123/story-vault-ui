import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RiArrowLeftLine, RiAddLine, RiDeleteBinLine } from "react-icons/ri";
import {
  Title,
  Button,
  Group,
  Paper,
  ActionIcon,
  Stack,
  Textarea,
  Text,
} from "@mantine/core";
import type { Memory } from "../models/Memory";
import { useMemories } from "../hooks/useMemories";
import { v4 as uuidv4 } from "uuid";
import { ConfirmModal } from "../components/ConfirmModal";
import isEqual from "lodash.isequal";
import { Page } from "./Page";

export const MemoriesPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const {
    memories: initialMemories,
    saveMemories,
    isLoading,
  } = useMemories(chatId!);
  const [localMemories, setLocalMemories] = useState<Memory[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [memoryToDelete, setMemoryToDelete] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasInitialized) {
      setLocalMemories([...initialMemories]);
      setHasInitialized(true);
    }
  }, [isLoading, initialMemories, hasInitialized]);

  useEffect(() => {
    if (hasInitialized) {
      setIsDirty(!isEqual(initialMemories, localMemories));
    }
  }, [localMemories, initialMemories, hasInitialized]);

  const handleAddMemory = () => {
    const newMemory: Memory = {
      id: uuidv4(),
      content: "",
    };
    setLocalMemories([...localMemories, newMemory]);
  };

  const handleMemoryChange = (id: string, content: string) => {
    setLocalMemories((prev) =>
      prev.map((memory) => (memory.id === id ? { ...memory, content } : memory))
    );
  };

  const handleRemoveMemory = (id: string) => {
    setMemoryToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const confirmRemoveMemory = () => {
    if (memoryToDelete) {
      setLocalMemories((prev) =>
        prev.filter((memory) => memory.id !== memoryToDelete)
      );
    }
    setIsConfirmModalOpen(false);
    setMemoryToDelete(null);
  };

  const handleSave = async () => {
    await saveMemories(localMemories);
    navigate(`/chat/${chatId}`);
  };

  const handleGoBack = () => {
    navigate(`/chat/${chatId}`);
  };

  return (
    <Page>
      <Paper
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        withBorder
        shadow="md"
        p={30}
        mt={30}
        radius="md"
      >
        <MemoriesHeader onGoBack={handleGoBack} isDirty={isDirty} />

        <Stack>
          <Group justify="space-between">
            <Text fw={500}>Memories</Text>
            <Button variant="subtle" onClick={handleAddMemory}>
              <RiAddLine /> Add Memory
            </Button>
          </Group>
          {localMemories.map((memory) => (
            <Paper key={memory.id} withBorder p="md">
              <Textarea
                placeholder="Enter your memory here..."
                value={memory.content}
                onChange={(e) =>
                  handleMemoryChange(memory.id, e.currentTarget.value)
                }
                minRows={3}
                autosize
              />
              <Button
                variant="outline"
                color="red"
                onClick={() => handleRemoveMemory(memory.id)}
                mt="sm"
              >
                <RiDeleteBinLine /> Delete Memory
              </Button>
            </Paper>
          ))}
        </Stack>
      </Paper>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmRemoveMemory}
        title="Confirm Deletion"
        message="Are you sure you want to delete this memory?"
      />
    </Page>
  );
};

interface MemoriesHeaderProps {
  onGoBack: () => void;
  isDirty: boolean;
}

const MemoriesHeader: React.FC<MemoriesHeaderProps> = ({
  onGoBack,
  isDirty,
}) => (
  <Group justify="space-between" align="center" mb="xl">
    <Group>
      <ActionIcon onClick={onGoBack} variant="gradient" size="lg">
        <RiArrowLeftLine />
      </ActionIcon>
      <Title order={2}>Memories</Title>
    </Group>
    <Button type="submit" disabled={!isDirty}>
      Save Changes
    </Button>
  </Group>
);
