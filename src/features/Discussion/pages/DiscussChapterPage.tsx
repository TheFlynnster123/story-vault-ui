import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { RiBookOpenLine } from "react-icons/ri";
import { Theme } from "../../../components/Theme";
import { DiscussionPage } from "./DiscussionPage";
import { DiscussionService } from "../services/DiscussionService";
import { createChapterDiscussionConfig } from "../services/ChapterDiscussionConfig";
import type { DiscussionPageConfig } from "./DiscussionPageConfig";

const pageConfig: DiscussionPageConfig = {
  primaryColor: Theme.chapter.primary,
  borderColor: Theme.chapter.border,
  assistantBubbleBackground: Theme.chapter.backgroundSecondary,
  accentColor: "yellow",
  icon: <RiBookOpenLine size={24} color={Theme.chapter.primary} />,
  title: "Discuss Chapter Summary",
  description:
    'Discuss the chapter summary with the AI. When you\'re satisfied, click "Generate Updated Chapter Summary" to regenerate the summary using this conversation as feedback.',
  inputPlaceholder: "Discuss chapter summary…",
  generateButtonLabel: "Generate Updated Chapter Summary",
  emptyStateText:
    "Start a conversation about this chapter's summary. Discuss what happened, suggest corrections, or refine the narrative.",
};

export const DiscussChapterPage: React.FC = () => {
  const { chatId, chapterId } = useParams<{
    chatId: string;
    chapterId: string;
  }>();

  const service = useMemo(
    () =>
      new DiscussionService(createChapterDiscussionConfig(chatId!, chapterId!)),
    [chatId, chapterId],
  );

  return (
    <DiscussionPage chatId={chatId!} service={service} config={pageConfig} />
  );
};
