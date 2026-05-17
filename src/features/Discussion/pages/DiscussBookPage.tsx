import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { RiBook2Line } from "react-icons/ri";
import { Loader, Center } from "@mantine/core";
import { Theme } from "../../../components/Theme";
import { DiscussionPage } from "./DiscussionPage";
import { DiscussionService } from "../services/DiscussionService";
import { createBookDiscussionConfig } from "../services/BookDiscussionConfig";
import { useSystemPrompts } from "../../Prompts/hooks/useSystemPrompts";
import type { DiscussionPageConfig } from "./DiscussionPageConfig";

const pageConfig: DiscussionPageConfig = {
  primaryColor: Theme.book.primary,
  borderColor: Theme.book.border,
  assistantBubbleBackground: Theme.book.backgroundSecondary,
  accentColor: "green",
  icon: <RiBook2Line size={24} color={Theme.book.primary} />,
  title: "Discuss Book Summary",
  description:
    'Discuss the book summary with the AI. When you\'re satisfied, click "Generate Updated Book Summary" to regenerate the summary using this conversation as feedback.',
  inputPlaceholder: "Discuss book summary…",
  generateButtonLabel: "Generate Updated Book Summary",
  finalFeedbackButtonLabel: "Send & Generate Book Summary",
  emptyStateText:
    "Start a conversation about this book's summary. Discuss the overarching narrative, themes, or character arcs.",
  promptLink: "/system-prompts#discussBookPrompt",
};

export const DiscussBookPage: React.FC = () => {
  const { chatId, bookId } = useParams<{
    chatId: string;
    bookId: string;
  }>();

  const { systemPrompts, isLoading } = useSystemPrompts();

  const service = useMemo(
    () =>
      new DiscussionService(
        createBookDiscussionConfig(
          chatId!,
          bookId!,
          systemPrompts.bookSummaryModel,
          systemPrompts.bookSummaryPrompt,
          systemPrompts.discussBookPrompt,
        ),
      ),
    [
      chatId,
      bookId,
      systemPrompts.bookSummaryModel,
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
