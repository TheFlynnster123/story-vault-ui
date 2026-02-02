import React, { useState, useEffect } from "react";
import { useSystemPrompts } from "./useSystemPrompts";
import { useLocation } from "react-router-dom";
import { Group, Loader, Stack, Text, Textarea } from "@mantine/core";
import type { SystemPrompts } from "../../services/Prompts/SystemPrompts";
import { d } from "../../services/Dependencies";

export const SystemPromptsEditor: React.FC = () => {
  const { systemPrompts, isLoading } = useSystemPrompts();
  const location = useLocation();
  const [localPrompts, setLocalPrompts] = useState<SystemPrompts>({});
  const [highlightedPrompt, setHighlightedPrompt] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (systemPrompts) {
      setLocalPrompts({ ...systemPrompts });
    }
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
      <Stack
        gap="xs"
        id="newStoryPrompt"
        style={{
          padding: "12px",
          borderRadius: "8px",
          transition: "background-color 0.3s ease",
          backgroundColor:
            highlightedPrompt === "newStoryPrompt"
              ? "rgba(64, 192, 87, 0.1)"
              : "transparent",
        }}
      >
        <Textarea
          label="New Story Generation Prompt"
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
    </Stack>
  );
};
