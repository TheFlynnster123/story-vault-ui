import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RiArrowLeftLine, RiAddLine, RiDeleteBinLine } from "react-icons/ri";
import { LuBrain } from "react-icons/lu";
import { v4 as uuidv4 } from "uuid";
import {
  Title,
  Button,
  Group,
  Paper,
  ActionIcon,
  Stack,
  Textarea,
  Text,
  Divider,
} from "@mantine/core";
import type { Memory } from "../services/ChatGeneration/Memory";
import { useMemories } from "../components/Chat/useMemories";
import { Page } from "./Page";
import { Theme } from "../components/Common/Theme";
import { ConfirmModal } from "../components/Common/ConfirmModal";
import { d } from "../services/Dependencies";

export const MemoriesPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();

  const { memories, isLoading } = useMemories(chatId!);
  const [formMemories, setFormMemories] = useState<Memory[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [memoryToDeleteId, setMemoryToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setFormMemories([...memories]);
    }
  }, [isLoading, memories]);

  const handleAddMemory = () => {
    const newMemory: Memory = { id: uuidv4(), content: "" };
    const updatedMemories = [...formMemories, newMemory];
    setFormMemories(updatedMemories);
    d.MemoriesService(chatId!).saveDebounced(updatedMemories);
  };

  const handleMemoryChange = (id: string, content: string) => {
    const updatedMemories = formMemories.map((memory) =>
      memory.id === id ? { ...memory, content } : memory
    );
    setFormMemories(updatedMemories);

    d.MemoriesService(chatId!).saveDebounced(updatedMemories);
  };

  const onRemoveMemory = (id: string) => {
    setMemoryToDeleteId(id);
    setIsConfirmModalOpen(true);
  };

  const onConfirmRemoveMemory = async () => {
    if (memoryToDeleteId) {
      await d.MemoriesService(chatId!).removeMemory(memoryToDeleteId);

      const updatedMemories = await d.MemoriesService(chatId!).get();

      setFormMemories(updatedMemories);
    }

    setIsConfirmModalOpen(false);
    setMemoryToDeleteId(null);
  };

  const handleGoBack = async () => {
    await d.MemoriesService(chatId!).save(formMemories);
    navigate(`/chat/${chatId}`);
  };

  return (
    <Page>
      <Paper mt={20}>
        <MemoriesHeader onGoBack={handleGoBack} />

        <Stack>
          <Group justify="space-between">
            <Text fw={500}>Memories</Text>
            <Button
              variant="subtle"
              onClick={handleAddMemory}
              style={{ color: Theme.memories.primary }}
            >
              <RiAddLine /> Add Memory
            </Button>
          </Group>
          {formMemories.map((memory) => (
            <Stack key={memory.id} gap="sm">
              <Textarea
                placeholder="Enter your memory here..."
                value={memory.content}
                onChange={(e) =>
                  handleMemoryChange(memory.id, e.currentTarget.value)
                }
                minRows={3}
                autosize
                styles={{
                  input: {
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    borderColor: Theme.memories.border,
                    color: Theme.page.text,
                  },
                }}
              />
              <Button
                variant="outline"
                color="red"
                onClick={() => onRemoveMemory(memory.id)}
                style={{ alignSelf: "flex-start" }}
              >
                <RiDeleteBinLine /> Delete Memory
              </Button>
              <Divider my="sm" style={{ borderColor: Theme.memories.border }} />
            </Stack>
          ))}
        </Stack>
      </Paper>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={onConfirmRemoveMemory}
        title="Confirm Deletion"
        message="Are you sure you want to delete this memory?"
      />
    </Page>
  );
};

interface MemoriesHeaderProps {
  onGoBack: () => void;
}

const MemoriesHeader: React.FC<MemoriesHeaderProps> = ({ onGoBack }) => (
  <>
    <Group justify="space-between" align="center" mb="md">
      <Group>
        <ActionIcon onClick={onGoBack} variant="subtle" size="lg">
          <RiArrowLeftLine color={Theme.page.text} />
        </ActionIcon>
        <LuBrain size={24} color={Theme.memories.primary} />
        <Title order={2} fw={400} style={{ color: Theme.memories.primary }}>
          Memories
        </Title>
      </Group>
    </Group>
    <Divider mb="xl" style={{ borderColor: Theme.memories.border }} />
  </>
);
