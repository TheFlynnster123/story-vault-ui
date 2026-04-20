import React, { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { RiBookOpenLine } from "react-icons/ri";
import { Loader, Center } from "@mantine/core";
import { Theme } from "../../../components/Theme";
import { DiscussionPage } from "./DiscussionPage";
import { DiscussionService } from "../services/DiscussionService";
import { createNewChapterDiscussionConfig } from "../services/NewChapterDiscussionConfig";
import { useSystemPrompts } from "../../Prompts/hooks/useSystemPrompts";
import type { DiscussionPageConfig } from "./DiscussionPageConfig";

const pageConfig: DiscussionPageConfig = {
  primaryColor: Theme.chapter.primary,
  borderColor: Theme.chapter.border,
  assistantBubbleBackground: Theme.chapter.backgroundSecondary,
  accentColor: "yellow",
  icon: <RiBookOpenLine size={24} color={Theme.chapter.primary} />,
  title: "Discuss New Chapter Summary",
  description:
    'Discuss what the chapter summary should contain with the AI. When you\'re satisfied, click "Create Chapter" to generate the summary and create the chapter.',
  inputPlaceholder: "Discuss chapter summary…",
  generateButtonLabel: "Create Chapter",
  finalFeedbackButtonLabel: "Send & Create Chapter",
  emptyStateText:
    "Start a conversation about what this chapter's summary should contain. Discuss what happened, suggest key events, and refine the narrative.",
  acceptMessageLabel: "Use This Summary",
};

export const DiscussNewChapterPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [searchParams] = useSearchParams();
  const chapterTitle = searchParams.get("title") || "Untitled Chapter";

  const { systemPrompts, isLoading } = useSystemPrompts();

  const service = useMemo(
    () =>
      new DiscussionService(
        createNewChapterDiscussionConfig(
          chatId!,
          chapterTitle,
          systemPrompts.chapterSummaryModel,
          systemPrompts.chapterSummaryPrompt,
        ),
      ),
    [
      chatId,
      chapterTitle,
      systemPrompts.chapterSummaryModel,
      systemPrompts.chapterSummaryPrompt,
    ],
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
