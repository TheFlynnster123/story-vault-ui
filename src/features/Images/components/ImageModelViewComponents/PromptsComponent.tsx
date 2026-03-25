import React from "react";
import { Textarea, Stack, Title, Group, Button } from "@mantine/core";
import type { ImageModel } from "../../services/modelGeneration/ImageModel";

interface PromptsComponentProps {
  imageModel: ImageModel;
  onChange: (updatedModel: ImageModel) => void;
}

export const PromptsComponent: React.FC<PromptsComponentProps> = ({
  imageModel,
  onChange,
}) => {
  const handlePromptChange = (
    field: "prompt" | "negativePrompt",
    value: string,
  ) => {
    onChange({
      ...imageModel,
      input: {
        ...imageModel.input,
        params: {
          ...imageModel.input.params,
          [field]: value,
        },
      },
    });
  };

  const prompt = imageModel.input.params.prompt ?? "";
  const trainedWords = imageModel.trainedWords ?? [];

  const isWordInPrompt = (word: string): boolean => {
    const words = prompt.split(",").map((w) => w.trim().toLowerCase());
    return words.includes(word.toLowerCase());
  };

  const toggleTrainedWord = (word: string) => {
    if (isWordInPrompt(word)) {
      const updated = removeWordFromPrompt(prompt, word);
      handlePromptChange("prompt", updated);
    } else {
      const updated = appendWordToPrompt(prompt, word);
      handlePromptChange("prompt", updated);
    }
  };

  return (
    <Stack>
      <Title order={5}>Prompts</Title>
      <Textarea
        label="Base Prompt"
        value={prompt}
        onChange={(e) => handlePromptChange("prompt", e.target.value)}
        autosize
        minRows={3}
      />
      {trainedWords.length > 0 && (
        <TrainedWordsToggle
          trainedWords={trainedWords}
          isWordInPrompt={isWordInPrompt}
          onToggle={toggleTrainedWord}
        />
      )}
      <Textarea
        label="Negative Prompt"
        value={imageModel.input.params.negativePrompt || ""}
        onChange={(e) => handlePromptChange("negativePrompt", e.target.value)}
        autosize
        minRows={3}
      />
    </Stack>
  );
};

interface TrainedWordsToggleProps {
  trainedWords: string[];
  isWordInPrompt: (word: string) => boolean;
  onToggle: (word: string) => void;
}

const TrainedWordsToggle: React.FC<TrainedWordsToggleProps> = ({
  trainedWords,
  isWordInPrompt,
  onToggle,
}) => (
  <Group gap="xs">
    {trainedWords.map((word) => (
      <Button
        key={word}
        size="xs"
        variant={isWordInPrompt(word) ? "filled" : "outline"}
        onClick={() => onToggle(word)}
      >
        {word}
      </Button>
    ))}
  </Group>
);

export const appendWordToPrompt = (prompt: string, word: string): string =>
  prompt.trim() ? `${prompt.trim()}, ${word}` : word;

export const removeWordFromPrompt = (prompt: string, word: string): string =>
  prompt
    .split(",")
    .map((w) => w.trim())
    .filter((w) => w.toLowerCase() !== word.toLowerCase())
    .join(", ");
