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
    'Discuss what the chapter summary should contain with the AI. When you\'re satisfied, generate a draft and review it before creating the chapter.',
  inputPlaceholder: "Discuss chapter summary…",
  generateButtonLabel: "Review Chapter Draft",
  finalFeedbackButtonLabel: "Send & Review Draft",
  emptyStateText:
    "Start a conversation about what this chapter's summary should contain. Discuss what happened, suggest key events, and refine the narrative.",
  acceptMessageLabel: "Review This Summary",
  promptLink: "/system-prompts#discussChapterPrompt",
};

export const DiscussNewChapterPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [searchParams] = useSearchParams();
  const chapterTitle = searchParams.get("title") || "Untitled Chapter";
  const draftSummary = searchParams.get("summary") || undefined;

  const { systemPrompts, isLoading } = useSystemPrompts();

  const service = useMemo(
    () =>
      new DiscussionService(
        createNewChapterDiscussionConfig(
          chatId!,
          chapterTitle,
          systemPrompts.chapterSummaryModel,
          systemPrompts.chapterSummaryRequestSettings,
          systemPrompts.chapterSummaryPrompt,
          systemPrompts.discussChapterPrompt,
          draftSummary,
        ),
      ),
    [
      chatId,
      chapterTitle,
      draftSummary,
      systemPrompts.chapterSummaryModel,
      systemPrompts.chapterSummaryRequestSettings,
      systemPrompts.chapterSummaryPrompt,
      systemPrompts.discussChapterPrompt,
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
