import React, { useState, useEffect } from "react";
import { Modal, Textarea, Button, Stack } from "@mantine/core";
import { d } from "../../services/Dependencies";

interface PromptSetupModalProps {
  chatId: string;
  isOpen: boolean;
  initialPrompt?: string;
  onClose: () => void;
}

export const PromptSetupModal: React.FC<PromptSetupModalProps> = ({
  chatId,
  isOpen,
  initialPrompt,
  onClose,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt || "");

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSave = async () => {
    if (!prompt.trim()) return;

    const chatSettings = await d.ChatSettingsService(chatId).Get();
    if (chatSettings) {
      await d.ChatSettingsService(chatId).save({
        ...chatSettings,
        prompt: prompt.trim(),
      });
    }

    onClose();
  };

  return (
    <Modal
      opened={isOpen}
      onClose={() => {}}
      title="Setup Chat Prompt"
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
    >
      <Stack>
        <Textarea
          label="Prompt"
          placeholder="Enter your chat prompt..."
          minRows={10}
          value={prompt}
          onChange={(e) => setPrompt(e.currentTarget.value)}
          autoFocus
        />
        <Button onClick={handleSave} disabled={!prompt.trim()}>
          Save Prompt
        </Button>
      </Stack>
    </Modal>
  );
};
