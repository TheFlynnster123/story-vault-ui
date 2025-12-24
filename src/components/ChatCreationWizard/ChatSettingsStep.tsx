import React, { useState } from "react";
import {
  Stack,
  Select,
  Textarea,
  Text,
  Button,
  Paper,
  Image,
  FileButton,
  Group,
  TextInput,
  Loader,
  Divider,
} from "@mantine/core";
import {
  RiCheckLine,
  RiImageLine,
  RiSparklingLine,
  RiArrowLeftLine,
} from "react-icons/ri";
import type { ChatCreationWizardState } from "../../models/ChatCreationWizardState";
import { useCivitJob } from "../../hooks/useCivitJob";
import { CivitJobAPI } from "../../clients/CivitJobAPI";
import { d } from "../../app/Dependencies/Dependencies";

interface ChatSettingsStepProps {
  chatId: string;
  state: ChatCreationWizardState;
  updateState: (updates: Partial<ChatCreationWizardState>) => void;
  onCreate: () => void;
  onBack: () => void;
  isCreating: boolean;
}

export const ChatSettingsStep: React.FC<ChatSettingsStepProps> = ({
  chatId,
  state,
  updateState,
  onCreate,
  onBack,
  isCreating,
}) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use CivitJob to resolve background from jobId if set
  const { photoBase64: civitJobPhoto, jobStatus } = useCivitJob(
    chatId,
    state.backgroundPhotoCivitJobId || ""
  );

  const isLoadingCivitJob =
    state.backgroundPhotoCivitJobId && !civitJobPhoto && jobStatus?.isLoading;

  const displayPhoto = civitJobPhoto || state.backgroundPhotoBase64;

  const hasPhoto = !!displayPhoto || isLoadingCivitJob;

  const handlePhotoUpload = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      updateState({ backgroundPhotoBase64: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateBackground = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const selectedModel = await d
        .ImageModelService()
        .getOrDefaultSelectedModel();
      const modelInput = JSON.parse(JSON.stringify(selectedModel.input));

      modelInput.params.prompt = modelInput.params.prompt
        ? `${modelInput.params.prompt}, ${prompt}`
        : prompt;

      const response = await new CivitJobAPI().generateImage(modelInput);
      const newJobId = response.jobs[0].jobId;
      updateState({ backgroundPhotoCivitJobId: newJobId });
      setPrompt("");
    } catch (e) {
      d.ErrorService().log("Failed to generate background image", e);
      setError("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemove = () => {
    updateState({
      backgroundPhotoBase64: undefined,
      backgroundPhotoCivitJobId: undefined,
    });
    setError(null);
  };

  return (
    <Stack gap="xl">
      <Stack gap="md">
        <Select
          label="Prompt Type"
          data={["First Person Character", "Manual"]}
          value={state.promptType}
          onChange={(value) =>
            updateState({
              promptType: value as "Manual" | "First Person Character",
            })
          }
        />

        {state.promptType === "Manual" && (
          <Textarea
            label="Custom Prompt"
            placeholder="Enter your custom prompt..."
            value={state.customPrompt}
            onChange={(e) =>
              updateState({ customPrompt: e.currentTarget.value })
            }
            minRows={4}
          />
        )}

        <Divider />

        <Text size="sm" fw={500} mt="xs">
          Background Photo (Optional)
        </Text>
        {hasPhoto ? (
          <Paper withBorder p="sm">
            {isLoadingCivitJob ? (
              <Stack align="center" p="xl" gap="md">
                <Loader size="lg" />
                <Text size="sm" c="dimmed">
                  Generating background image...
                </Text>
              </Stack>
            ) : (
              <Stack gap="sm">
                <Image
                  src={displayPhoto}
                  alt="Background"
                  radius="md"
                  fit="contain"
                  mah={300}
                />
                <Button onClick={handleRemove} variant="light" color="red">
                  Remove Photo
                </Button>
              </Stack>
            )}
          </Paper>
        ) : (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Upload an image or generate one with AI
            </Text>

            <Group>
              <FileButton onChange={handlePhotoUpload} accept="image/*">
                {(props) => (
                  <Button
                    {...props}
                    variant="light"
                    leftSection={<RiImageLine size={16} />}
                  >
                    Upload Image
                  </Button>
                )}
              </FileButton>
            </Group>

            <Text size="xs" fw={500} c="dimmed">
              Or Generate with AI
            </Text>

            <TextInput
              placeholder="Describe the image..."
              value={prompt}
              onChange={(e) => setPrompt(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerateBackground();
                }
              }}
            />

            <Button
              onClick={handleGenerateBackground}
              loading={isGenerating}
              disabled={!prompt.trim()}
              leftSection={<RiSparklingLine size={16} />}
              variant="light"
            >
              Generate Background
            </Button>

            {error && (
              <Text size="sm" c="red">
                {error}
              </Text>
            )}
          </Stack>
        )}
      </Stack>

      <Group justify="center" gap="md">
        <Button
          onClick={onBack}
          variant="default"
          leftSection={<RiArrowLeftLine size={18} />}
          size="md"
        >
          Back
        </Button>
        <Button
          onClick={onCreate}
          loading={isCreating}
          leftSection={<RiCheckLine size={18} />}
          size="md"
        >
          Create Chat
        </Button>
      </Group>
    </Stack>
  );
};
