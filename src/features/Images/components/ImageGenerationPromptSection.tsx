import React from "react";
import { Checkbox, Group, Stack, Text, Textarea } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { EditPromptButton } from "../../AI/components/EditPromptButton";

interface ImageGenerationPromptSectionProps {
  prompt: string;
  appendToBase: boolean;
  onPromptChange: (value: string) => void;
  onAppendToBaseChange: (checked: boolean) => void;
}

export const ImageGenerationPromptSection: React.FC<
  ImageGenerationPromptSectionProps
> = ({ prompt, appendToBase, onPromptChange, onAppendToBaseChange }) => {
  const navigate = useNavigate();

  const handleEditBasePrompt = () => {
    navigate("/system-prompts#defaultImagePrompt");
  };

  return (
    <Stack gap="xs">
      <Textarea
        label="Image Generation Prompt (Optional)"
        description="Custom prompt that instructs the AI how to describe scenes for this model. Leave empty to use the base prompt from System Prompts."
        placeholder="Leave empty to use the default image generation prompt..."
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        minRows={4}
        autosize
      />

      <Group justify="space-between" align="center" gap="sm">
        <Checkbox
          label="Append to base prompt"
          checked={appendToBase}
          onChange={(e) => onAppendToBaseChange(e.currentTarget.checked)}
        />

        <EditPromptButton onClick={handleEditBasePrompt}>
          Edit Base Prompt
        </EditPromptButton>
      </Group>

      <Text size="xs" c="dimmed">
        When checked, the custom prompt is added after the base image prompt
        from System Prompts. When unchecked, the custom prompt replaces it.
      </Text>
    </Stack>
  );
};
