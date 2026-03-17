import React, { useState, useEffect } from "react";
import { useSystemPrompts } from "../hooks/useSystemPrompts";
import { Group, Loader, Stack, Text } from "@mantine/core";
import type { SystemPrompts } from "../services/SystemPrompts";
import { DEFAULT_SYSTEM_PROMPTS } from "../services/SystemPrompts";
import { d } from "../../../services/Dependencies";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { PromptInput } from "./PromptInput";
import { usePromptHighlight } from "../hooks/usePromptHighlight";
import { ModelSelect } from "../../AI/components/ModelSelect";

export const SystemPromptsEditor: React.FC = () => {
  const { systemPrompts, isLoading } = useSystemPrompts();
  const highlightedPrompt = usePromptHighlight();
  const [localPrompts, setLocalPrompts] = useState<SystemPrompts>(
    DEFAULT_SYSTEM_PROMPTS,
  );
  const [resetConfirmation, setResetConfirmation] = useState<{
    isOpen: boolean;
    promptKey: keyof SystemPrompts | null;
    promptName: string;
  }>({
    isOpen: false,
    promptKey: null,
    promptName: "",
  });

  useEffect(() => {
    setLocalPrompts({ ...systemPrompts });
  }, [systemPrompts]);

  const handlePromptChange = (newPrompts: Partial<SystemPrompts>) => {
    const updatedPrompts = { ...localPrompts, ...newPrompts };
    setLocalPrompts(updatedPrompts);

    d.SystemPromptsService().SaveDebounced(updatedPrompts);
  };

  const handleResetClick = (
    promptKey: keyof SystemPrompts,
    promptName: string,
  ) => {
    setResetConfirmation({ isOpen: true, promptKey, promptName });
  };

  const handleResetConfirm = () => {
    if (resetConfirmation.promptKey) {
      const updatedPrompts = {
        ...localPrompts,
        [resetConfirmation.promptKey]:
          DEFAULT_SYSTEM_PROMPTS[resetConfirmation.promptKey],
      };
      setLocalPrompts(updatedPrompts);
      d.SystemPromptsService().Save(updatedPrompts);
    }
    setResetConfirmation({ isOpen: false, promptKey: null, promptName: "" });
  };

  const handleResetCancel = () => {
    setResetConfirmation({ isOpen: false, promptKey: null, promptName: "" });
  };

  if (isLoading) {
    return (
      <Group>
        <Loader size="sm" />
        <Text>Loading prompts...</Text>
      </Group>
    );
  }

  return (
    <Stack gap="sm">
      <ConfirmModal
        isOpen={resetConfirmation.isOpen}
        onCancel={handleResetCancel}
        onConfirm={handleResetConfirm}
        title="Reset Prompt to Default"
        message={`Are you sure you want to reset "${resetConfirmation.promptName}" to its default value? This action cannot be undone.`}
      />

      <PromptInput
        id="newStoryPrompt"
        label="New Story Generation Prompt"
        helpText="This system prompt is used when users generate a new story. It should instruct the AI to create an engaging, open-ended story opening based on the user's input."
        value={localPrompts.newStoryPrompt || ""}
        isHighlighted={highlightedPrompt === "newStoryPrompt"}
        onChange={(value) => handlePromptChange({ newStoryPrompt: value })}
        onReset={() =>
          handleResetClick("newStoryPrompt", "New Story Generation Prompt")
        }
        minRows={6}
      />
      <ModelSelect
        value={localPrompts.newStoryModel || ""}
        onChange={(value) =>
          handlePromptChange({ newStoryModel: value || undefined })
        }
        label="Story Generation Model"
        withDescription={false}
      />

      <PromptInput
        id="defaultThirdPersonPrompt"
        label="Default Third Person Prompt"
        helpText="This prompt guides the AI to respond in third person perspective during chat conversations. It's used when creating chats with third-person narration."
        value={localPrompts.defaultThirdPersonPrompt || ""}
        isHighlighted={highlightedPrompt === "defaultThirdPersonPrompt"}
        onChange={(value) =>
          handlePromptChange({ defaultThirdPersonPrompt: value })
        }
        onReset={() =>
          handleResetClick(
            "defaultThirdPersonPrompt",
            "Default Third Person Prompt",
          )
        }
      />

      <PromptInput
        id="defaultFirstPersonPrompt"
        label="Default First Person Prompt"
        helpText="This prompt guides the AI to respond in first person perspective during chat conversations. It's used when creating chats with first-person narration."
        value={localPrompts.defaultFirstPersonPrompt || ""}
        isHighlighted={highlightedPrompt === "defaultFirstPersonPrompt"}
        onChange={(value) =>
          handlePromptChange({ defaultFirstPersonPrompt: value })
        }
        onReset={() =>
          handleResetClick(
            "defaultFirstPersonPrompt",
            "Default First Person Prompt",
          )
        }
      />

      <PromptInput
        id="defaultImagePrompt"
        label="Default Image Generation Prompt"
        helpText="This prompt instructs the AI how to describe scenes for image generation. It's used when generating images in chats unless overridden by a chat-specific image model prompt."
        value={localPrompts.defaultImagePrompt || ""}
        isHighlighted={highlightedPrompt === "defaultImagePrompt"}
        onChange={(value) => handlePromptChange({ defaultImagePrompt: value })}
        onReset={() =>
          handleResetClick(
            "defaultImagePrompt",
            "Default Image Generation Prompt",
          )
        }
        minRows={6}
      />
      <ModelSelect
        value={localPrompts.defaultImageModel || ""}
        onChange={(value) =>
          handlePromptChange({ defaultImageModel: value || undefined })
        }
        label="Image Prompt Generation Model"
        withDescription={false}
      />

      <PromptInput
        id="chapterSummaryPrompt"
        label="Chapter Summary Prompt"
        helpText="This prompt instructs the AI how to generate chapter summaries when compressing conversation history into chapters."
        value={localPrompts.chapterSummaryPrompt || ""}
        isHighlighted={highlightedPrompt === "chapterSummaryPrompt"}
        onChange={(value) =>
          handlePromptChange({ chapterSummaryPrompt: value })
        }
        onReset={() =>
          handleResetClick("chapterSummaryPrompt", "Chapter Summary Prompt")
        }
      />
      <ModelSelect
        value={localPrompts.chapterSummaryModel || ""}
        onChange={(value) =>
          handlePromptChange({ chapterSummaryModel: value || undefined })
        }
        label="Chapter Summary Model"
        withDescription={false}
      />

      <PromptInput
        id="chapterTitlePrompt"
        label="Chapter Title Prompt"
        helpText="This prompt instructs the AI how to generate concise, engaging titles for chapters."
        value={localPrompts.chapterTitlePrompt || ""}
        isHighlighted={highlightedPrompt === "chapterTitlePrompt"}
        onChange={(value) =>
          handlePromptChange({ chapterTitlePrompt: value })
        }
        onReset={() =>
          handleResetClick("chapterTitlePrompt", "Chapter Title Prompt")
        }
      />
      <ModelSelect
        value={localPrompts.chapterTitleModel || ""}
        onChange={(value) =>
          handlePromptChange({ chapterTitleModel: value || undefined })
        }
        label="Chapter Title Model"
        withDescription={false}
      />
    </Stack>
  );
};
