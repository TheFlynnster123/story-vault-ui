import React, { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { RiBook2Line } from "react-icons/ri";
import { Loader, Center } from "@mantine/core";
import { Theme } from "../../../components/Theme";
import { DiscussionPage } from "./DiscussionPage";
import { DiscussionService } from "../services/DiscussionService";
import { createNewBookDiscussionConfig } from "../services/NewBookDiscussionConfig";
import { useSystemPrompts } from "../../Prompts/hooks/useSystemPrompts";
import type { DiscussionPageConfig } from "./DiscussionPageConfig";

const pageConfig: DiscussionPageConfig = {
  primaryColor: Theme.book.primary,
  borderColor: Theme.book.border,
  assistantBubbleBackground: Theme.book.backgroundSecondary,
  accentColor: "green",
  icon: <RiBook2Line size={24} color={Theme.book.primary} />,
  title: "Discuss New Book Summary",
  description:
    'Discuss what the book summary should contain with the AI. When you\'re satisfied, click "Create Book" to generate the summary and create the book.',
  inputPlaceholder: "Discuss book summary…",
  generateButtonLabel: "Create Book",
  finalFeedbackButtonLabel: "Send & Create Book",
  emptyStateText:
    "Start a conversation about what this book's summary should contain. Discuss the overarching narrative, themes, or character arcs.",
  acceptMessageLabel: "Use This Summary",
  promptLink: "/system-prompts#discussBookPrompt",
};

export const DiscussNewBookPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [searchParams] = useSearchParams();
  const bookTitle = searchParams.get("title") || "Untitled Book";
  const chapterIds = useMemo(() => searchParams.getAll("chapterId"), [
    searchParams,
  ]);

  const { systemPrompts, isLoading } = useSystemPrompts();

  const service = useMemo(
    () =>
      new DiscussionService(
        createNewBookDiscussionConfig(
          chatId!,
          bookTitle,
          chapterIds,
          systemPrompts.bookSummaryModel,
          systemPrompts.bookSummaryRequestSettings,
          systemPrompts.bookSummaryPrompt,
          systemPrompts.discussBookPrompt,
        ),
      ),
    [
      chatId,
      bookTitle,
      chapterIds,
      systemPrompts.bookSummaryModel,
      systemPrompts.bookSummaryRequestSettings,
      systemPrompts.bookSummaryPrompt,
      systemPrompts.discussBookPrompt,
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
