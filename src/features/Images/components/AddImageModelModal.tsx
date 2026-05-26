import React, { useState } from "react";
import {
  Modal,
  Stack,
  Button,
  TextInput,
  Text,
  Group,
  Divider,
  Alert,
  Loader,
} from "@mantine/core";
import { RiAddLine, RiDownloadLine } from "react-icons/ri";
import { d } from "../../../services/Dependencies";
import type { ImageModel } from "../services/modelGeneration/ImageModel";
import { v4 as uuidv4 } from "uuid";

interface AddImageModelModalProps {
  opened: boolean;
  onClose: () => void;
  onModelCreated: (model: ImageModel) => void;
}

const createBlankModel = (): ImageModel => ({
  id: uuidv4(),
  name: "New Image Model",
  timestampUtcMs: Date.now(),
  input: {
    engine: "sdcpp",
    ecosystem: "sdxl",
    operation: "createImage",
    model: "urn:air:sdxl:checkpoint:civitai:257749@290640",
    prompt: "score_9, score_8_up, score_7_up, score_6_up, source_anime",
    negativePrompt:
      "text, logo, watermark, signature, letterbox, bad anatomy, missing limbs, missing fingers, deformed, cropped, lowres, bad hands, jpeg artifacts",
    sampleMethod: "dpmpp_2m",
    schedule: "karras",
    steps: 20,
    cfgScale: 7,
    width: 1024,
    height: 1024,
    loras: {},
  },
});

export const AddImageModelModal: React.FC<AddImageModelModalProps> = ({
  opened,
  onClose,
  onModelCreated,
}) => {
  const [imageIdOrUrl, setImageIdOrUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleClose = () => {
    setImageIdOrUrl("");
    setImportError(null);
    onClose();
  };

  const handleCreateBlank = () => {
    onModelCreated(createBlankModel());
    handleClose();
  };

  const handleImportFromImage = async () => {
    if (!imageIdOrUrl.trim()) {
      setImportError("Please enter a valid image ID or URL.");
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      const model = await d
        .ImageModelFromGeneratedImageService()
        .GenerateImageModel(imageIdOrUrl.trim());

      if (model) {
        onModelCreated({ ...model, id: uuidv4(), timestampUtcMs: Date.now() });
        handleClose();
      } else {
        setImportError(
          "Could not load a model from the provided image ID or URL.",
        );
      }
    } catch {
      setImportError("Failed to import model. Check the ID or URL and retry.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Add Image Model"
      size="md"
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Import from Image
          </Text>
          <Text size="xs" c="dimmed">
            Enter a Civitai image ID or URL to import the model settings from a
            generated image.
          </Text>
          <TextInput
            placeholder="Image ID or URL"
            value={imageIdOrUrl}
            onChange={(e) => setImageIdOrUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleImportFromImage()}
            disabled={importing}
            leftSection={<RiDownloadLine size={16} />}
          />
          {importError && (
            <Alert color="red" p="xs">
              {importError}
            </Alert>
          )}
          <Button
            onClick={handleImportFromImage}
            disabled={importing || !imageIdOrUrl.trim()}
            leftSection={
              importing ? <Loader size={14} /> : <RiDownloadLine size={16} />
            }
          >
            {importing ? "Importing…" : "Import from Image"}
          </Button>
        </Stack>

        <Divider label="or" labelPosition="center" />

        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Create Blank Model
          </Text>
          <Text size="xs" c="dimmed">
            Start with a blank model you can configure from scratch.
          </Text>
          <Button
            variant="outline"
            onClick={handleCreateBlank}
            leftSection={<RiAddLine size={16} />}
          >
            Create Blank Model
          </Button>
        </Stack>

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
