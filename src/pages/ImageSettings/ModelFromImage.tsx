import React, { useState } from "react";
import { Button, TextInput, Group, Stack, Alert, Loader } from "@mantine/core";
import {
  RiDownloadLine,
  RiErrorWarningLine,
  RiCheckboxCircleLine,
} from "react-icons/ri";
import { GeneratedImageModelService } from "../../app/ImageModels/GeneratedImageModelService";
import type { ImageModel } from "../../app/ImageModels/ImageModel";
import { d } from "../../app/Dependencies/Dependencies";

interface ModelFromImageProps {
  onModelLoaded: (model: ImageModel) => void;
}

export const ModelFromImage: React.FC<ModelFromImageProps> = ({
  onModelLoaded,
}) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isNumericId = (input: string): boolean => {
    return /^\d+$/.test(input);
  };

  const extractIdFromQueryParam = (url: URL): string | null => {
    const id = url.searchParams.get("id");
    return id && isNumericId(id) ? id : null;
  };

  const extractIdFromPath = (url: URL): string | null => {
    const pathSegments = url.pathname.split("/");
    const lastSegment = pathSegments[pathSegments.length - 1];
    return isNumericId(lastSegment) ? lastSegment : null;
  };

  const extractIdFromLegacyFormat = (input: string): string | null => {
    const idMatch = input.match(/id=(\d+)$/);
    return idMatch ? idMatch[1] : null;
  };

  const extractImageId = (urlOrId: string): string | null => {
    const trimmed = urlOrId.trim();

    // If it's just a number/ID, return it
    if (isNumericId(trimmed)) {
      return trimmed;
    }

    // Try to parse as URL
    try {
      const url = new URL(trimmed);
      
      // Check for query parameter format (existing format)
      const queryId = extractIdFromQueryParam(url);
      if (queryId) {
        return queryId;
      }

      // Check for path format (new format: /images/60288057)
      const pathId = extractIdFromPath(url);
      if (pathId) {
        return pathId;
      }
    } catch {
      // Not a valid URL, continue to legacy checks
    }

    // Try legacy format extraction
    return extractIdFromLegacyFormat(trimmed);
  };

  const loadModel = async () => {
    const imageId = extractImageId(input);

    if (!imageId) {
      setError("Please enter a valid image URL or ID");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const service = new GeneratedImageModelService();
      const model = await service.GenerateImageModel(imageId);

      if (model) {
        onModelLoaded(model);
        setSuccess(`Successfully loaded model: ${model.name}`);
        setInput(""); // Clear input after success
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
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          style={{ flex: 1 }}
        />
        <Button
          leftSection={<RiDownloadLine />}
          onClick={loadModel}
          disabled={!input.trim() || isLoading}
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
