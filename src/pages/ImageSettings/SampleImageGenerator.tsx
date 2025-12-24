import React, { useState, useEffect } from "react";
import { Button, Group } from "@mantine/core";
import { RiImageLine, RiErrorWarningLine, RiCheckLine } from "react-icons/ri";
import { useCivitJob } from "../../hooks/useCivitJob";
import type { ImageModel } from "../../app/ImageModels/ImageModel";
import { d } from "../../app/Dependencies/Dependencies";

const EMULATED_CHAT_ID = "SAMPLE_IMAGE_GENERATOR";

interface SampleImageGeneratorProps {
  model: ImageModel;
  onSampleImageCreated?: (jobId: string) => void;
}

export const SampleImageGenerator: React.FC<SampleImageGeneratorProps> = ({
  model,
  onSampleImageCreated,
}) => {
  const [jobId, setJobId] = useState<string | null>(
    model.sampleImageId || null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setJobId(model.sampleImageId || null);
  }, [model.sampleImageId]);

  const { photoBase64, jobStatus } = useCivitJob(EMULATED_CHAT_ID, jobId || "");

  // Track if we're actively waiting for a job (either generating or polling)
  const isWaitingForJob =
    !!jobId && !photoBase64 && !isGenerating && !error && jobStatus?.scheduled;
  const hasImage = !!photoBase64 && !error;

  const startGeneration = async () => {
    setIsGenerating(true);
    setError(null);
    setJobId(null);

    try {
      const response = await d.CivitJobAPI().generateImage(model.input);
      const newJobId = response.jobs[0].jobId;
      setJobId(newJobId);
      onSampleImageCreated?.(newJobId);
    } catch (e) {
      d.ErrorService().log("Failed to generate sample image", e);
      setError("Failed to generate sample image");
    } finally {
      setIsGenerating(false);
    }
  };

  const getButtonProps = () => {
    if (error) {
      return {
        children: "Generation Failed - Retry",
        color: "red" as const,
        variant: "light" as const,
        leftSection: <RiErrorWarningLine />,
        loading: false,
        disabled: false,
      };
    }

    if (isGenerating || isWaitingForJob) {
      return {
        loaderProps: { type: "dots" },
        children: "Generating image...",
        variant: "filled" as const,
        leftSection: null, // No icon when loading
        loading: true,
        disabled: true,
      };
    }

    if (hasImage) {
      return {
        children: "Generate Sample",
        color: "green" as const,
        variant: "light" as const,
        leftSection: <RiImageLine />,
        rightSection: <RiCheckLine />,
        loading: false,
        disabled: false,
      };
    }

    return {
      children: "Generate Sample",
      variant: "light" as const,
      leftSection: <RiImageLine />,
      loading: false,
      disabled: false,
    };
  };

  return (
    <Group justify="center">
      <Button {...getButtonProps()} onClick={startGeneration} />
    </Group>
  );
};
