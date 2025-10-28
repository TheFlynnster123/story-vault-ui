import React, { useState } from "react";
import { Button, Card, Group, Text, Image, Loader, Alert } from "@mantine/core";
import { RiImageLine, RiErrorWarningLine } from "react-icons/ri";
import { CivitJobAPI } from "../../clients/CivitJobAPI";
import { useCivitJob } from "../../hooks/useCivitJob";
import type { ImageModel } from "../../app/ImageModels/ImageModel";
import { d } from "../../app/Dependencies/Dependencies";

interface SampleImageGeneratorProps {
  model: ImageModel;
  chatId?: string; // For storing the generated image
}

export const SampleImageGenerator: React.FC<SampleImageGeneratorProps> = ({
  model,
  chatId = "SAMPLE_GENERATOR",
}) => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: photoBase64 } = useCivitJob(chatId, jobId || "");

  // Track if we're actively waiting for a job (either generating or polling)
  const isWaitingForJob = !!jobId && !photoBase64;

  const startGeneration = async () => {
    setIsGenerating(true);
    setError(null);
    setJobId(null);

    try {
      const response = await new CivitJobAPI().generateImage(model.input);
      setJobId(response.jobs[0].jobId);
    } catch (e) {
      d.ErrorService().log("Failed to generate sample image", e);
      setError("Failed to generate sample image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = isGenerating || isWaitingForJob;
  const hasImage = photoBase64 && !isLoading;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={500} size="lg">
          Sample Image Generator
        </Text>
        <Button
          variant="light"
          leftSection={<RiImageLine />}
          onClick={startGeneration}
          disabled={isLoading}
          loading={isGenerating}
        >
          {hasImage ? "Generate New Sample" : "Generate Sample"}
        </Button>
      </Group>

      <Text size="sm" c="dimmed" mb="md">
        Generate a sample image using this model configuration to preview the
        results.
      </Text>

      {error && (
        <Alert
          icon={<RiErrorWarningLine />}
          title="Generation Failed"
          color="red"
          mb="md"
        >
          {error}
        </Alert>
      )}

      {isLoading && (
        <Group justify="center" p="xl">
          <Loader size="lg" />
          <Text>
            {isGenerating ? "Starting job..." : "Waiting for image..."}
          </Text>
        </Group>
      )}

      {hasImage && (
        <div>
          <Text size="sm" fw={500} mb="xs">
            Generated Sample:
          </Text>
          <Image
            src={photoBase64}
            alt="Generated sample image"
            radius="md"
            fit="contain"
            style={{ maxHeight: "400px" }}
          />
        </div>
      )}

      {!hasImage && !isLoading && !error && (
        <Group justify="center" p="xl">
          <Text c="dimmed" ta="center">
            Click "Generate Sample" to create a preview image using this model
            configuration.
          </Text>
        </Group>
      )}
    </Card>
  );
};
