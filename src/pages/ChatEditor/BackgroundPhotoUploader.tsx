import React, { useState } from "react";
import {
  Button,
  Group,
  Paper,
  Image,
  FileButton,
  Text,
  Stack,
  TextInput,
  Loader,
} from "@mantine/core";
import { RiImageLine, RiSparklingLine } from "react-icons/ri";
import { useCivitJob } from "../../hooks/useCivitJob";
import { d } from "../../app/Dependencies/Dependencies";

interface BackgroundPhotoUploaderProps {
  chatId: string;
  backgroundPhotoBase64?: string;
  backgroundPhotoCivitJobId?: string;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
  onCivitJobIdChange: (jobId: string | undefined) => void;
}

export const BackgroundPhotoUploader: React.FC<
  BackgroundPhotoUploaderProps
> = ({
  chatId,
  backgroundPhotoBase64,
  backgroundPhotoCivitJobId,
  onPhotoUpload,
  onRemovePhoto,
  onCivitJobIdChange,
}) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use CivitJob to resolve background from jobId if set
  const { photoBase64: civitJobPhoto, jobStatus } = useCivitJob(
    chatId,
    backgroundPhotoCivitJobId || ""
  );

  const isLoadingCivitJob =
    backgroundPhotoCivitJobId && !civitJobPhoto && jobStatus?.isLoading;

  const displayPhoto = civitJobPhoto || backgroundPhotoBase64;

  const hasPhoto = !!displayPhoto || isLoadingCivitJob;

  const handleGenerateBackground = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const selectedModel = await d
        .ImageModelService()
        .getOrDefaultSelectedModel();
      const modelInput = JSON.parse(JSON.stringify(selectedModel.input));

      // Append the user's prompt to the model's base prompt
      modelInput.params.prompt = modelInput.params.prompt
        ? `${modelInput.params.prompt}, ${prompt}`
        : prompt;

      const response = await d.CivitJobAPI().generateImage(modelInput);
      const newJobId = response.jobs[0].jobId;
      onCivitJobIdChange(newJobId);
      setPrompt("");
    } catch (e) {
      d.ErrorService().log("Failed to generate background image", e);
      setError("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemove = () => {
    onRemovePhoto();
    onCivitJobIdChange(undefined);
    setError(null);
  };

  return (
    <div>
      <Text size="sm" fw={500}>
        Background Photo
      </Text>
      {hasPhoto ? (
        <Paper withBorder p="sm" mt="xs">
          {isLoadingCivitJob ? (
            <Stack align="center" p="xl" gap="md">
              <Loader size="lg" />
              <Text size="sm" c="dimmed">
                Generating background image...
              </Text>
            </Stack>
          ) : (
            <Image src={displayPhoto} alt="Background preview" radius="sm" />
          )}
          <Button
            variant="outline"
            color="red"
            fullWidth
            mt="sm"
            onClick={handleRemove}
          >
            Remove Photo
          </Button>
        </Paper>
      ) : (
        <Stack my="lg" gap="md">
          <Group justify="center">
            <FileButton
              onChange={(file) =>
                onPhotoUpload({
                  target: { files: file ? [file] : null },
                } as React.ChangeEvent<HTMLInputElement>)
              }
              accept="image/png,image/jpeg,image/gif"
            >
              {(props) => (
                <Button {...props} leftSection={<RiImageLine />}>
                  Upload Image
                </Button>
              )}
            </FileButton>
          </Group>

          <Text size="sm" c="dimmed" ta="center">
            or
          </Text>

          <Stack>
            <TextInput
              placeholder="e.g., A cozy medieval tavern with warm firelight"
              label="Generate with AI"
              description="Describe the background you want to generate"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              error={error}
              disabled={isGenerating}
            />
            <Button
              onClick={handleGenerateBackground}
              loading={isGenerating}
              disabled={!prompt.trim() || isGenerating}
              leftSection={<RiSparklingLine />}
              variant="light"
            >
              Generate Background
            </Button>
          </Stack>
        </Stack>
      )}
    </div>
  );
};
