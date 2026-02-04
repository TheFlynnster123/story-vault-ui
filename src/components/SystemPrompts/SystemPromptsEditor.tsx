import React, { useState, useEffect } from "react";
import { useSystemPrompts } from "./useSystemPrompts";
import { useLocation } from "react-router-dom";
import {
  ActionIcon,
  Group,
  Loader,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { VscRefresh } from "react-icons/vsc";
import type { SystemPrompts } from "../../services/Prompts/SystemPrompts";
import { DEFAULT_SYSTEM_PROMPTS } from "../../services/Prompts/SystemPrompts";
import { d } from "../../services/Dependencies";
import { ConfirmModal } from "../Common/ConfirmModal";

export const SystemPromptsEditor: React.FC = () => {
  const { systemPrompts, isLoading } = useSystemPrompts();
  const location = useLocation();
  const [localPrompts, setLocalPrompts] = useState<SystemPrompts>(
    DEFAULT_SYSTEM_PROMPTS,
  );
  const [highlightedPrompt, setHighlightedPrompt] = useState<string | null>(
    null,
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

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash) {
      setHighlightedPrompt(hash);
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);

      // Clear highlight after 3 seconds
      setTimeout(() => setHighlightedPrompt(null), 3000);
    }
  }, [location.hash]);

  const handlePromptChange = (newPrompts: Partial<SystemPrompts>) => {
    const updatedPrompts = { ...localPrompts, ...newPrompts };
    setLocalPrompts(updatedPrompts);

    d.SystemPromptsService().SaveDebounced(updatedPrompts);
  };

  const handleResetClick = (
    promptKey: keyof SystemPrompts,
    promptName: string,
  ) => {
    setResetConfirmation({
      isOpen: true,
      promptKey,
      promptName,
    });
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
    <Stack gap="md">
      <ConfirmModal
        isOpen={resetConfirmation.isOpen}
        onCancel={handleResetCancel}
        onConfirm={handleResetConfirm}
        title="Reset Prompt to Default"
        message={`Are you sure you want to reset "${resetConfirmation.promptName}" to its default value? This action cannot be undone.`}
      />

      <Stack
        gap="xs"
        id="newStoryPrompt"
        style={{
          padding: "12px",
          borderRadius: "8px",
          backgroundColor:
            highlightedPrompt === "newStoryPrompt"
              ? "rgba(255, 152, 0, 0.1)"
              : "transparent",
          border:
            highlightedPrompt === "newStoryPrompt"
              ? "2px solid rgba(255, 152, 0, 0.5)"
              : "2px solid transparent",
          transition: "all 0.3s ease",
        }}
      >
        <Group justify="space-between" align="center" mb="xs">
          <Text fw={500} size="sm">
            New Story Generation Prompt
          </Text>
          <Tooltip label="Reset to default">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() =>
                handleResetClick(
                  "newStoryPrompt",
                  "New Story Generation Prompt",
                )
              }
              color="gray"
            >
              <VscRefresh size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Textarea
          description="This prompt guides the AI when generating new stories from user input"
          value={localPrompts.newStoryPrompt || ""}
          onChange={(e) =>
            handlePromptChange({ newStoryPrompt: e.currentTarget.value })
          }
          minRows={6}
          autosize
        />
        <Text size="sm" c="dimmed">
          This system prompt is used when users generate a new story. It should
          instruct the AI to create an engaging, open-ended story opening based
          on the user's input.
        </Text>
      </Stack>

      <Stack
        gap="xs"
        id="defaultThirdPersonPrompt"
        style={{
          padding: "12px",
          borderRadius: "8px",
          backgroundColor:
            highlightedPrompt === "defaultThirdPersonPrompt"
              ? "rgba(64, 192, 87, 0.1)"
              : "transparent",
          border:
            highlightedPrompt === "defaultThirdPersonPrompt"
              ? "2px solid rgba(64, 192, 87, 0.5)"
              : "2px solid transparent",
          transition: "all 0.3s ease",
        }}
      >
        <Group justify="space-between" align="center" mb="xs">
          <Text fw={500} size="sm">
            Default Third Person Prompt
          </Text>
          <Tooltip label="Reset to default">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() =>
                handleResetClick(
                  "defaultThirdPersonPrompt",
                  "Default Third Person Prompt",
                )
              }
              color="gray"
            >
              <VscRefresh size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Textarea
          description="This prompt is used in chat conversations with third-person narration"
          value={localPrompts.defaultThirdPersonPrompt || ""}
          onChange={(e) =>
            handlePromptChange({
              defaultThirdPersonPrompt: e.currentTarget.value,
            })
          }
          minRows={4}
          autosize
        />
        <Text size="sm" c="dimmed">
          This prompt guides the AI to respond in third person perspective
          during chat conversations. It's used when creating chats with
          third-person narration.
        </Text>
      </Stack>

      <Stack
        gap="xs"
        id="defaultFirstPersonPrompt"
        style={{
          padding: "12px",
          borderRadius: "8px",
          backgroundColor:
            highlightedPrompt === "defaultFirstPersonPrompt"
              ? "rgba(66, 153, 225, 0.1)"
              : "transparent",
          border:
            highlightedPrompt === "defaultFirstPersonPrompt"
              ? "2px solid rgba(66, 153, 225, 0.5)"
              : "2px solid transparent",
          transition: "all 0.3s ease",
        }}
      >
        <Group justify="space-between" align="center" mb="xs">
          <Text fw={500} size="sm">
            Default First Person Prompt
          </Text>
          <Tooltip label="Reset to default">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() =>
                handleResetClick(
                  "defaultFirstPersonPrompt",
                  "Default First Person Prompt",
                )
              }
              color="gray"
            >
              <VscRefresh size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Textarea
          description="This prompt is used in chat conversations with first-person narration"
          value={localPrompts.defaultFirstPersonPrompt || ""}
          onChange={(e) =>
            handlePromptChange({
              defaultFirstPersonPrompt: e.currentTarget.value,
            })
          }
          minRows={4}
          autosize
        />
        <Text size="sm" c="dimmed">
          This prompt guides the AI to respond in first person perspective
          during chat conversations. It's used when creating chats with
          first-person narration.
        </Text>
      </Stack>
    </Stack>
  );
};
