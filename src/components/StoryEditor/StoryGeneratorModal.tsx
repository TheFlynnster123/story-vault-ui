import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { ModelSelect } from "../AI/ModelSelect";
import { GenerateButton } from "../AI/GenerateButton";
import { EditPromptButton } from "../AI/EditPromptButton";
import { useSystemSettings } from "../SystemSettings/useSystemSettings";
import { useSystemPrompts } from "../SystemPrompts/useSystemPrompts";
import { d } from "../../services/Dependencies";

interface StoryGeneratorModalProps {
  onStoryGenerated?: (story: string) => void;
}

export const StoryGeneratorModal: React.FC<StoryGeneratorModalProps> = ({
  onStoryGenerated,
}) => {
  const navigate = useNavigate();
  const { systemSettings } = useSystemSettings();
  const { systemPrompts } = useSystemPrompts();
  const [opened, setOpened] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const defaultModel = useMemo(
    () => systemSettings?.chatGenerationSettings?.model ?? "",
    [systemSettings]
  );

  useEffect(() => {
    if (!opened) return;
    setPrompt("");
    setModel(defaultModel || "");
  }, [opened, defaultModel]);

  const handleClose = () => setOpened(false);

  const handleEditPrompt = () => {
    navigate("/system-prompts#newStoryPrompt");
  };

  const handleRun = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const systemPrompt = systemPrompts?.newStoryPrompt || "";
      const messages = [
        {
          role: "system" as const,
          content: systemPrompt,
        },
        {
          role: "user" as const,
          content: prompt,
        },
      ];

      const generatedStory = await d
        .GrokChatAPI()
        .postChat(messages, model || undefined);

      onStoryGenerated?.(generatedStory);
      handleClose();
    } catch (error) {
      d.ErrorService().log("Failed to generate story", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const disableRun = !prompt.trim();

  return (
    <>
      <GenerateButton
        className="StoryEditorAIButton"
        onClick={() => setOpened(true)}
      />

      <Modal
        opened={opened}
        onClose={handleClose}
        title="Generate Story with AI"
        size="lg"
        centered
      >
        <Stack>
          <Textarea
            label="Story Prompt"
            placeholder="Make a story about..."
            minRows={4}
            autosize
            value={prompt}
            onChange={(event) => setPrompt(event.currentTarget.value)}
            disabled={isGenerating}
          />

          <Stack gap="xs">
            <ModelSelect value={model ?? ""} onChange={setModel} />
            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                The AI will generate a story opening or template based on your
                prompt.
              </Text>
              <EditPromptButton onClick={handleEditPrompt} />
            </Group>
          </Stack>

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={handleClose}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <GenerateButton
              onClick={handleRun}
              disabled={disableRun || isGenerating}
              loading={isGenerating}
            >
              Generate Story
            </GenerateButton>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
