import React, { useState, useEffect } from "react";
import { useSystemPrompts } from "../hooks/useSystemPrompts";
import { Group, Loader, Paper, Stack, Text } from "@mantine/core";
import type { SystemPrompts } from "../services/SystemPrompts";
import { DEFAULT_SYSTEM_PROMPTS } from "../services/SystemPrompts";
import { d } from "../../../services/Dependencies";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { PromptInput } from "./PromptInput";
import { usePromptHighlight } from "../hooks/usePromptHighlight";
import { ModelSelect } from "../../AI/components/ModelSelect";
import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";
import {
  LuBookOpen,
  LuMessageSquare,
  LuImage,
  LuUserSearch,
  LuUser,
  LuFileText,
  LuHeading,
  LuLibrary,
  LuBookMarked,
  LuMessageCircle,
  LuWorkflow,
  LuBrain,
  LuSparkles,
} from "react-icons/lu";

const PromptSection: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Paper withBorder p="md" radius="md">
    <Stack gap="sm">{children}</Stack>
  </Paper>
);

const buildModelPromptPatch = (
  modelKey: keyof SystemPrompts,
  requestSettingsKey: keyof SystemPrompts,
  model: string | null,
  requestSettings?: OpenRouterRequestSettings,
): Partial<SystemPrompts> =>
  ({
    [modelKey]: model || undefined,
    [requestSettingsKey]: requestSettings,
  }) as Partial<SystemPrompts>;

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
    <Stack gap="lg">
      <ConfirmModal
        isOpen={resetConfirmation.isOpen}
        onCancel={handleResetCancel}
        onConfirm={handleResetConfirm}
        title="Reset Prompt to Default"
        message={`Are you sure you want to reset "${resetConfirmation.promptName}" to its default value? This action cannot be undone.`}
      />

      <PromptSection>
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
          icon={<LuBookOpen size={18} color="orange" />}
        />
        <ModelSelect
          value={localPrompts.newStoryModel || ""}
          onChange={(value) =>
            handlePromptChange(
              buildModelPromptPatch(
                "newStoryModel",
                "newStoryRequestSettings",
                value,
                localPrompts.newStoryRequestSettings,
              ),
            )
          }
          requestSettings={localPrompts.newStoryRequestSettings}
          onRequestSettingsChange={(requestSettings) =>
            handlePromptChange(
              buildModelPromptPatch(
                "newStoryModel",
                "newStoryRequestSettings",
                localPrompts.newStoryModel || null,
                requestSettings,
              ),
            )
          }
          label="Story Generation Model"
          withDescription={false}
        />
      </PromptSection>

      <PromptSection>
        <PromptInput
          id="defaultThirdPersonPrompt"
          label="Default Chat Prompt"
          helpText="This prompt guides how the AI responds during chat conversations by default. It is the default chat prompt used when creating new chats."
          value={localPrompts.defaultThirdPersonPrompt || ""}
          isHighlighted={highlightedPrompt === "defaultThirdPersonPrompt"}
          onChange={(value) =>
            handlePromptChange({ defaultThirdPersonPrompt: value })
          }
          onReset={() =>
            handleResetClick("defaultThirdPersonPrompt", "Default Chat Prompt")
          }
          icon={<LuMessageSquare size={18} color="orange" />}
        />
      </PromptSection>

      <PromptSection>
        <PromptInput
          id="defaultImagePrompt"
          label="Default Image Generation Prompt"
          helpText="This prompt instructs the AI how to describe scenes for image generation. It's used when generating images in chats unless overridden by a chat-specific image model prompt."
          value={localPrompts.defaultImagePrompt || ""}
          isHighlighted={highlightedPrompt === "defaultImagePrompt"}
          onChange={(value) =>
            handlePromptChange({ defaultImagePrompt: value })
          }
          onReset={() =>
            handleResetClick(
              "defaultImagePrompt",
              "Default Image Generation Prompt",
            )
          }
          minRows={6}
          icon={<LuImage size={18} color="orange" />}
        />
        <ModelSelect
          value={localPrompts.defaultImageModel || ""}
          onChange={(value) =>
            handlePromptChange(
              buildModelPromptPatch(
                "defaultImageModel",
                "defaultImageRequestSettings",
                value,
                localPrompts.defaultImageRequestSettings,
              ),
            )
          }
          requestSettings={localPrompts.defaultImageRequestSettings}
          onRequestSettingsChange={(requestSettings) =>
            handlePromptChange(
              buildModelPromptPatch(
                "defaultImageModel",
                "defaultImageRequestSettings",
                localPrompts.defaultImageModel || null,
                requestSettings,
              ),
            )
          }
          label="Image Prompt Generation Model"
          withDescription={false}
        />
      </PromptSection>

      <PromptSection>
        <PromptInput
          id="characterSelectionPrompt"
          label="Character Selection Prompt"
          helpText="This prompt instructs the AI to select the single most prominent character to depict for the next generated image."
          value={localPrompts.characterSelectionPrompt || ""}
          isHighlighted={highlightedPrompt === "characterSelectionPrompt"}
          onChange={(value) =>
            handlePromptChange({ characterSelectionPrompt: value })
          }
          onReset={() =>
            handleResetClick(
              "characterSelectionPrompt",
              "Character Selection Prompt",
            )
          }
          icon={<LuUserSearch size={18} color="orange" />}
        />
        <ModelSelect
          value={localPrompts.characterSelectionModel || ""}
          onChange={(value) =>
            handlePromptChange(
              buildModelPromptPatch(
                "characterSelectionModel",
                "characterSelectionRequestSettings",
                value,
                localPrompts.characterSelectionRequestSettings,
              ),
            )
          }
          requestSettings={localPrompts.characterSelectionRequestSettings}
          onRequestSettingsChange={(requestSettings) =>
            handlePromptChange(
              buildModelPromptPatch(
                "characterSelectionModel",
                "characterSelectionRequestSettings",
                localPrompts.characterSelectionModel || null,
                requestSettings,
              ),
            )
          }
          label="Character Selection Model"
          withDescription={false}
        />
      </PromptSection>

      <PromptSection>
        <PromptInput
          id="characterDescriptionPrompt"
          label="Character Appearance Prompt"
          helpText="This prompt instructs the AI to generate comma-separated, appearance-only character traits for consistent image generation."
          value={localPrompts.characterDescriptionPrompt || ""}
          isHighlighted={highlightedPrompt === "characterDescriptionPrompt"}
          onChange={(value) =>
            handlePromptChange({ characterDescriptionPrompt: value })
          }
          onReset={() =>
            handleResetClick(
              "characterDescriptionPrompt",
              "Character Appearance Prompt",
            )
          }
          icon={<LuUser size={18} color="orange" />}
        />
        <ModelSelect
          value={localPrompts.characterDescriptionModel || ""}
          onChange={(value) =>
            handlePromptChange(
              buildModelPromptPatch(
                "characterDescriptionModel",
                "characterDescriptionRequestSettings",
                value,
                localPrompts.characterDescriptionRequestSettings,
              ),
            )
          }
          requestSettings={localPrompts.characterDescriptionRequestSettings}
          onRequestSettingsChange={(requestSettings) =>
            handlePromptChange(
              buildModelPromptPatch(
                "characterDescriptionModel",
                "characterDescriptionRequestSettings",
                localPrompts.characterDescriptionModel || null,
                requestSettings,
              ),
            )
          }
          label="Character Appearance Model"
          withDescription={false}
        />
      </PromptSection>

      <PromptSection>
        <PromptInput
          id="activeCharactersPrompt"
          label="Active Characters Prompt"
          helpText="This prompt selects only the characters active in the current scene. Its proposed activity changes require approval before they are applied."
          value={localPrompts.activeCharactersPrompt || ""}
          isHighlighted={highlightedPrompt === "activeCharactersPrompt"}
          onChange={(value) =>
            handlePromptChange({ activeCharactersPrompt: value })
          }
          onReset={() =>
            handleResetClick(
              "activeCharactersPrompt",
              "Active Characters Prompt",
            )
          }
          minRows={8}
          icon={<LuUserSearch size={18} color="orange" />}
        />
        <ModelSelect
          value={localPrompts.activeCharactersModel || ""}
          onChange={(value) =>
            handlePromptChange(
              buildModelPromptPatch(
                "activeCharactersModel",
                "activeCharactersRequestSettings",
                value,
                localPrompts.activeCharactersRequestSettings,
              ),
            )
          }
          requestSettings={localPrompts.activeCharactersRequestSettings}
          onRequestSettingsChange={(requestSettings) =>
            handlePromptChange(
              buildModelPromptPatch(
                "activeCharactersModel",
                "activeCharactersRequestSettings",
                localPrompts.activeCharactersModel || null,
                requestSettings,
              ),
            )
          }
          label="Active Characters Model"
          withDescription={false}
        />
      </PromptSection>

      <PromptSection>
        <PromptInput
          id="characterSheetUpdatePrompt"
          label="Character Sheet Update Prompt"
          helpText="This prompt replaces complete identity-focused bullet lists for selected characters. Proposed changes require approval before they are applied."
          value={localPrompts.characterSheetUpdatePrompt || ""}
          isHighlighted={highlightedPrompt === "characterSheetUpdatePrompt"}
          onChange={(value) =>
            handlePromptChange({ characterSheetUpdatePrompt: value })
          }
          onReset={() =>
            handleResetClick(
              "characterSheetUpdatePrompt",
              "Character Sheet Update Prompt",
            )
          }
          minRows={10}
          icon={<LuUser size={18} color="orange" />}
        />
        <ModelSelect
          value={localPrompts.characterSheetUpdateModel || ""}
          onChange={(value) =>
            handlePromptChange(
              buildModelPromptPatch(
                "characterSheetUpdateModel",
                "characterSheetUpdateRequestSettings",
                value,
                localPrompts.characterSheetUpdateRequestSettings,
              ),
            )
          }
          requestSettings={localPrompts.characterSheetUpdateRequestSettings}
          onRequestSettingsChange={(requestSettings) =>
            handlePromptChange(
              buildModelPromptPatch(
                "characterSheetUpdateModel",
                "characterSheetUpdateRequestSettings",
                localPrompts.characterSheetUpdateModel || null,
                requestSettings,
              ),
            )
          }
          label="Character Sheet Update Model"
          withDescription={false}
        />
      </PromptSection>

      <PromptSection>
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
          icon={<LuFileText size={18} color="orange" />}
        />
        <ModelSelect
          value={localPrompts.chapterSummaryModel || ""}
          onChange={(value) =>
            handlePromptChange(
              buildModelPromptPatch(
                "chapterSummaryModel",
                "chapterSummaryRequestSettings",
                value,
                localPrompts.chapterSummaryRequestSettings,
              ),
            )
          }
          requestSettings={localPrompts.chapterSummaryRequestSettings}
          onRequestSettingsChange={(requestSettings) =>
            handlePromptChange(
              buildModelPromptPatch(
                "chapterSummaryModel",
                "chapterSummaryRequestSettings",
                localPrompts.chapterSummaryModel || null,
                requestSettings,
              ),
            )
          }
          label="Chapter Draft Model"
          withDescription={false}
        />
      </PromptSection>

      <PromptSection>
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
          icon={<LuHeading size={18} color="orange" />}
        />
      </PromptSection>

      <PromptSection>
        <PromptInput
          id="bookSummaryPrompt"
          label="Book Summary Prompt"
          helpText="This prompt instructs the AI how to generate book summaries when compressing multiple chapters into a book."
          value={localPrompts.bookSummaryPrompt || ""}
          isHighlighted={highlightedPrompt === "bookSummaryPrompt"}
          onChange={(value) => handlePromptChange({ bookSummaryPrompt: value })}
          onReset={() =>
            handleResetClick("bookSummaryPrompt", "Book Summary Prompt")
          }
          icon={<LuLibrary size={18} color="orange" />}
        />
        <ModelSelect
          value={localPrompts.bookSummaryModel || ""}
          onChange={(value) =>
            handlePromptChange(
              buildModelPromptPatch(
                "bookSummaryModel",
                "bookSummaryRequestSettings",
                value,
                localPrompts.bookSummaryRequestSettings,
              ),
            )
          }
          requestSettings={localPrompts.bookSummaryRequestSettings}
          onRequestSettingsChange={(requestSettings) =>
            handlePromptChange(
              buildModelPromptPatch(
                "bookSummaryModel",
                "bookSummaryRequestSettings",
                localPrompts.bookSummaryModel || null,
                requestSettings,
              ),
            )
          }
          label="Book Summary Model"
          withDescription={false}
        />
      </PromptSection>

      <PromptSection>
        <PromptInput
          id="bookTitlePrompt"
          label="Book Title Prompt"
          helpText="This prompt instructs the AI how to generate concise, engaging titles for books."
          value={localPrompts.bookTitlePrompt || ""}
          isHighlighted={highlightedPrompt === "bookTitlePrompt"}
          onChange={(value) => handlePromptChange({ bookTitlePrompt: value })}
          onReset={() =>
            handleResetClick("bookTitlePrompt", "Book Title Prompt")
          }
          icon={<LuBookMarked size={18} color="orange" />}
        />
        <ModelSelect
          value={localPrompts.bookTitleModel || ""}
          onChange={(value) =>
            handlePromptChange(
              buildModelPromptPatch(
                "bookTitleModel",
                "bookTitleRequestSettings",
                value,
                localPrompts.bookTitleRequestSettings,
              ),
            )
          }
          requestSettings={localPrompts.bookTitleRequestSettings}
          onRequestSettingsChange={(requestSettings) =>
            handlePromptChange(
              buildModelPromptPatch(
                "bookTitleModel",
                "bookTitleRequestSettings",
                localPrompts.bookTitleModel || null,
                requestSettings,
              ),
            )
          }
          label="Book Title Model"
          withDescription={false}
        />
      </PromptSection>

      <PromptSection>
        <PromptInput
          id="agentIntentPrompt"
          label="Agent Intent Prompt"
          helpText="This prompt instructs the AI how to analyze the current chat and suggest agentic workflow actions such as updating memory, generating images, refreshing plans, or creating chapters."
          value={localPrompts.agentIntentPrompt || ""}
          isHighlighted={highlightedPrompt === "agentIntentPrompt"}
          onChange={(value) => handlePromptChange({ agentIntentPrompt: value })}
          onReset={() =>
            handleResetClick("agentIntentPrompt", "Agent Intent Prompt")
          }
          minRows={8}
          icon={<LuWorkflow size={18} color="orange" />}
        />
        <ModelSelect
          value={localPrompts.agentIntentModel || ""}
          onChange={(value) =>
            handlePromptChange(
              buildModelPromptPatch(
                "agentIntentModel",
                "agentIntentRequestSettings",
                value,
                localPrompts.agentIntentRequestSettings,
              ),
            )
          }
          requestSettings={localPrompts.agentIntentRequestSettings}
          onRequestSettingsChange={(requestSettings) =>
            handlePromptChange(
              buildModelPromptPatch(
                "agentIntentModel",
                "agentIntentRequestSettings",
                localPrompts.agentIntentModel || null,
                requestSettings,
              ),
            )
          }
          label="Agent Intent Model"
          withDescription={false}
        />
      </PromptSection>

      <PromptSection>
        <PromptInput
          id="planSuggestionPrompt"
          label="Plan Suggestion Prompt"
          helpText="This prompt instructs the AI how to suggest three short plan directions before generating a full story plan."
          value={localPrompts.planSuggestionPrompt || ""}
          isHighlighted={highlightedPrompt === "planSuggestionPrompt"}
          onChange={(value) =>
            handlePromptChange({ planSuggestionPrompt: value })
          }
          onReset={() =>
            handleResetClick("planSuggestionPrompt", "Plan Suggestion Prompt")
          }
          minRows={5}
          icon={<LuSparkles size={18} color="orange" />}
        />
        <ModelSelect
          value={localPrompts.planSuggestionModel || ""}
          onChange={(value) =>
            handlePromptChange(
              buildModelPromptPatch(
                "planSuggestionModel",
                "planSuggestionRequestSettings",
                value,
                localPrompts.planSuggestionRequestSettings,
              ),
            )
          }
          requestSettings={localPrompts.planSuggestionRequestSettings}
          onRequestSettingsChange={(requestSettings) =>
            handlePromptChange(
              buildModelPromptPatch(
                "planSuggestionModel",
                "planSuggestionRequestSettings",
                localPrompts.planSuggestionModel || null,
                requestSettings,
              ),
            )
          }
          label="Plan Suggestion Model"
          withDescription={false}
        />
      </PromptSection>

      <PromptSection>
        <PromptInput
          id="reasoningPrompt"
          label="Reasoning Prompt"
          helpText="This prompt instructs the AI how to create the reasoning message inserted between user input and the next response."
          value={localPrompts.reasoningPrompt || ""}
          isHighlighted={highlightedPrompt === "reasoningPrompt"}
          onChange={(value) => handlePromptChange({ reasoningPrompt: value })}
          onReset={() =>
            handleResetClick("reasoningPrompt", "Reasoning Prompt")
          }
          minRows={5}
          icon={<LuBrain size={18} color="orange" />}
        />
      </PromptSection>

      <PromptSection>
        <PromptInput
          id="discussChapterPrompt"
          label="Discuss Chapter Prompt"
          helpText="This prompt defines how the AI behaves during chapter discussion conversations. It guides tone, focus, and style when helping users create or refine chapter summaries."
          value={localPrompts.discussChapterPrompt || ""}
          isHighlighted={highlightedPrompt === "discussChapterPrompt"}
          onChange={(value) =>
            handlePromptChange({ discussChapterPrompt: value })
          }
          onReset={() =>
            handleResetClick("discussChapterPrompt", "Discuss Chapter Prompt")
          }
          icon={<LuMessageCircle size={18} color="orange" />}
        />
      </PromptSection>

      <PromptSection>
        <PromptInput
          id="discussStoryPrompt"
          label="Discuss Story Prompt"
          helpText="This prompt defines how the AI behaves during story discussion conversations. It guides tone, focus, and style when helping users discuss and refine their story."
          value={localPrompts.discussStoryPrompt || ""}
          isHighlighted={highlightedPrompt === "discussStoryPrompt"}
          onChange={(value) =>
            handlePromptChange({ discussStoryPrompt: value })
          }
          onReset={() =>
            handleResetClick("discussStoryPrompt", "Discuss Story Prompt")
          }
          icon={<LuMessageCircle size={18} color="orange" />}
        />
      </PromptSection>

      <PromptSection>
        <PromptInput
          id="discussPlanPrompt"
          label="Discuss Plan Prompt"
          helpText="This prompt defines how the AI behaves during plan discussion conversations. It guides tone, focus, and style when helping users discuss and refine their story plan."
          value={localPrompts.discussPlanPrompt || ""}
          isHighlighted={highlightedPrompt === "discussPlanPrompt"}
          onChange={(value) => handlePromptChange({ discussPlanPrompt: value })}
          onReset={() =>
            handleResetClick("discussPlanPrompt", "Discuss Plan Prompt")
          }
          icon={<LuMessageCircle size={18} color="orange" />}
        />
      </PromptSection>
    </Stack>
  );
};
