import React, { useState } from "react";
import { Button, TextInput, Group, Stack, Alert, Loader } from "@mantine/core";
import {
  RiDownloadLine,
  RiErrorWarningLine,
  RiCheckboxCircleLine,
} from "react-icons/ri";
import { d } from "../../services/Dependencies";
import type { ImageModel } from "../../services/Image/modelGeneration/ImageModel";

interface ModelFromImageProps {
  onModelLoaded: (model: ImageModel) => void;
}

export const ModelFromImage: React.FC<ModelFromImageProps> = ({
  onModelLoaded,
}) => {
  const [imageIdOrUrl, setImageIdOrUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadModel = async () => {
    if (!imageIdOrUrl) {
      setError("Please enter a valid image URL or ID");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const model = await d
        .ImageModelFromGeneratedImageService()
        .GenerateImageModel(imageIdOrUrl);

      if (model) {
        onModelLoaded(model);
        setSuccess(`Successfully loaded model: ${model.name}`);
        setImageIdOrUrl(""); // Clear input after success
      } else {
        setError("Failed to load model from the provided image ID");
      }
    } catch (e) {
      d.ErrorService().log(
        "Failed to load RL we'll just need to end of the model from image",
        e
      );
      setError(
        "Failed to load model. Please check the URL or ID and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !isLoading) {
      loadModel();
    }
  };

  return (
    <Stack>
      <Group align="end">
        <TextInput
          label="Load Model from Image"
          description="Enter a CivitAI image URL or image ID"
          placeholder="https://civitai.com/images/123456 or https://civitai.com/api/generation/data?type=image&id=123456 or just 123456"
          value={imageIdOrUrl}
          onChange={(e) => setImageIdOrUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          style={{ flex: 1 }}
        />
        <Button
          leftSection={<RiDownloadLine />}
          onClick={loadModel}
          disabled={!imageIdOrUrl.trim() || isLoading}
          loading={isLoading}
        >
          Load Model
        </Button>
      </Group>

      {error && (
        <Alert icon={<RiErrorWarningLine />} title="Error" color="red">
          {error}
        </Alert>
      )}

      {success && (
        <Alert icon={<RiCheckboxCircleLine />} title="Success" color="green">
          {success}
        </Alert>
      )}

      {isLoading && (
        <Group>
          <Loader size="sm" />
          <span>Loading model from CivitAI...</span>
        </Group>
      )}
    </Stack>
  );
};
