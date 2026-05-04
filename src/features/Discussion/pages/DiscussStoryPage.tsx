import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { LuBookOpen } from "react-icons/lu";
import { Loader, Center } from "@mantine/core";
import { Theme } from "../../../components/Theme";
import { DiscussionPage } from "./DiscussionPage";
import { DiscussionService } from "../services/DiscussionService";
import { createStoryDiscussionConfig } from "../services/StoryDiscussionConfig";
import { useSystemPrompts } from "../../Prompts/hooks/useSystemPrompts";
import type { DiscussionPageConfig } from "./DiscussionPageConfig";

const pageConfig: DiscussionPageConfig = {
  primaryColor: Theme.chatSettings.primary,
  borderColor: Theme.chatSettings.border,
  assistantBubbleBackground: Theme.chatSettings.backgroundSecondary,
  accentColor: "violet",
  icon: <LuBookOpen size={24} color={Theme.chatSettings.primary} />,
  title: "Discuss Story",
  description:
    'Discuss the story with the AI. When you\'re satisfied, click "Generate Updated Story" to regenerate the story using this conversation as feedback.',
  inputPlaceholder: "Discuss story…",
  generateButtonLabel: "Generate Updated Story",
  finalFeedbackButtonLabel: "Send & Generate Story",
  emptyStateText:
    "Start a conversation about your story. Discuss the premise, characters, setting, or narrative direction.",
  promptLink: "/system-prompts#discussStoryPrompt",
};

export const DiscussStoryPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const { systemPrompts, isLoading } = useSystemPrompts();

  const service = useMemo(
    () =>
      new DiscussionService(
        createStoryDiscussionConfig(chatId!, systemPrompts.discussStoryPrompt),
      ),
    [chatId, systemPrompts.discussStoryPrompt],
  );

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <DiscussionPage chatId={chatId!} service={service} config={pageConfig} />
  );
};
