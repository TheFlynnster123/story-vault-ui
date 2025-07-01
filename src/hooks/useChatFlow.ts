import type { ChatPage } from "../models/ChatPage";
import { useGrokChatAPI } from "./useGrokChatAPI";
import { useChatPages } from "./useChatPages";
import type { Message } from "../Chat/ChatMessage";
import { useCallback, useState } from "react";

export interface ChatFlowStep {
  id: string;
  stepType: "planning_notes" | "draft_message";
  content: string;
  timestamp: number;
}

interface UseChatFlowReturn {
  pages: ChatPage[];
  isSendingMessage: boolean;
  submitMessage: (messageText: string) => Promise<void>;
  isLoadingHistory: boolean;
  progressStatus?: string;
  chatFlowHistory: ChatFlowStep[];
}

interface UseChatFlowProps {
  chatId: string;
}

const CHAT_FLOW_TEMPLATES = {
  PLANNING_NOTES_PROMPT:
    "Planning Notes - Respond with ONLY the following template filled out. Do not provide a draft message yet:\n" +
    "Document memorable events and important contextual details with a bulleted list.\n" +
    "What elements of the story is the user seemingly responding to or enjoying? \n" +
    "Where are we at in the story flow? Should we continue engaging in dialogue, should we expand and let develop the current plot point, does another plot point need introducing?",

  DRAFT_PROMPT:
    "Without a preamble, take into consideration the user's most recent response and our notes, write your response.",
};

const PROGRESS_MESSAGES = {
  PLANNING_NOTES: "Planning response...",
  DRAFT_MESSAGE: "Writing response...",
};

export const useChatFlow = ({
  chatId,
}: UseChatFlowProps): UseChatFlowReturn => {
  const { grokChatApiClient } = useGrokChatAPI();

  const { pages, addMessage, isLoadingHistory, getMessageList } = useChatPages({
    chatId,
  });

  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string | undefined>(
    undefined
  );
  const [chatFlowHistory, setChatFlowHistory] = useState<ChatFlowStep[]>([]);

  const addChatFlowStep = useCallback(
    (stepType: ChatFlowStep["stepType"], content: string) => {
      const step: ChatFlowStep = {
        id: `${stepType}-${Date.now()}`,
        stepType,
        content,
        timestamp: Date.now(),
      };
      setChatFlowHistory((prev) => [...prev, step]);
      return step;
    },
    []
  );

  const submitMessage = useCallback(
    async (userMessageText: string) => {
      if (!chatId || !grokChatApiClient) {
        console.error("ChatId or Grok API client not available.");
        return;
      }

      setIsSendingMessage(true);
      setChatFlowHistory([]); // Clear previous flow history

      try {
        // Add user message to formal chat history
        await addMessage(toUserMessage(userMessageText));
        let localMessageList = getMessageList();

        // Step 1: Planning Notes
        setProgressStatus(PROGRESS_MESSAGES.PLANNING_NOTES);
        const planningNotesPrompt = CHAT_FLOW_TEMPLATES.PLANNING_NOTES_PROMPT;
        localMessageList.push(toSystemMessage(planningNotesPrompt));
        const planningNotesResponse = await grokChatApiClient.postChat(
          localMessageList
        );
        addChatFlowStep("planning_notes", planningNotesResponse);
        localMessageList.push(toSystemMessage(planningNotesResponse));

        // Step 2: Draft Message (Write Response)
        setProgressStatus(PROGRESS_MESSAGES.DRAFT_MESSAGE);
        const draftPrompt = CHAT_FLOW_TEMPLATES.DRAFT_PROMPT;
        localMessageList.push(toSystemMessage(draftPrompt));
        const draftResponse = await grokChatApiClient.postChat(
          localMessageList
        );

        // Add draft response as the official system response
        await addMessage(toSystemMessage(draftResponse));

        // Clear progress status
        setProgressStatus(undefined);
        setIsSendingMessage(false);
      } catch (error) {
        console.error("Error during ChatFlow submission:", error);
        setProgressStatus(undefined);
        setIsSendingMessage(false);
      }
    },
    [chatId, grokChatApiClient, addMessage, getMessageList, addChatFlowStep]
  );

  return {
    pages,
    isSendingMessage,
    submitMessage,
    isLoadingHistory,
    progressStatus,
    chatFlowHistory,
  };
};

function toUserMessage(userMessageText: string): Message {
  return {
    id: `user-${Date.now()}`,
    role: "user",
    content: userMessageText,
  };
}

function toSystemMessage(systemReplyText: string): Message {
  return {
    id: `system-${Date.now()}`,
    role: "system",
    content: systemReplyText,
  };
}

function toAssistantMessage(systemReplyText: string): Message {
  return {
    id: `assistant-${Date.now()}`,
    role: "assistant",
    content: systemReplyText,
  };
}
