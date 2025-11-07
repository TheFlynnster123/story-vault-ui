import React from "react";
import { Textarea, Stack, Title } from "@mantine/core";
import type { ImageModel } from "../../../app/ImageModels/ImageModel";

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
    value: string
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

  return (
    <Stack>
      <Title order={5}>Prompts</Title>
      <Textarea
        label="Base Prompt"
        value={imageModel.input.params.prompt}
        onChange={(e) => handlePromptChange("prompt", e.target.value)}
        autosize
        minRows={3}
      />
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
