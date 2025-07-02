import type { ChatPage } from "../models/ChatPage";
import { useGrokChatAPI } from "./useGrokChatAPI";
import { useChatPages } from "./useChatPages";
import type { Message } from "../Chat/ChatMessage";
import { useCallback, useState, useEffect } from "react";
import { useNoteAPI } from "./useNoteAPI";

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
  storySummary: string;
  userPreferences: string;
}

interface UseChatFlowProps {
  chatId: string;
}

const CHAT_FLOW_TEMPLATES = {
  PLANNING_NOTES_PROMPT:
    "Planning Notes - Respond with ONLY the following template filled out. Do not provide a draft message yet:\n" +
    "Where are we at in the story flow? Should we continue engaging in dialogue, should we expand and let develop the current plot point, does another plot point need introducing?",

  RESPONSE_PROMPT:
    "Without a preamble, take into consideration the user's most recent response and our notes, write your response.",

  SUMMARY_PROMPT:
    "Generate a bulleted list summarizing the story so far. Keep list items brief but descriptive, and afterwards ensure only a bulleted list is present in the response",

  SUMMARY_UPDATE_PROMPT:
    "Update this bulleted list summarizing the story so far. Keep list items brief but descriptive. Avoid deleting unique items. Avoid repeating details, and afterwards ensure only a bulleted list is present in the response:",

  USER_PREFERENCE_PROMPT:
    "Generate a bulleted list analyzing the user's preferences. What story elements is the user engaging with? Do they have any implicit or explicit preferences? Afterwards ensure only a bulleted list is present in the response",

  USER_PREFERENCE_UPDATE_PROMPT:
    "Update this bulleted list analyzing the user's preferences. What story elements is the user engaging with? Do they have any implicit or explicit preferences? Keep list items brief but descriptive. Avoid deleting unique items. Avoid repeating details, and afterwards ensure only a bulleted list is present in the response:",
};

const PROGRESS_MESSAGES = {
  PLANNING_NOTES: "Planning response...",
  RESPONSE_MESSAGE: "Writing response...",
};

export const useChatFlow = ({
  chatId,
}: UseChatFlowProps): UseChatFlowReturn => {
  const { grokChatApiClient } = useGrokChatAPI();

  const { pages, addMessage, isLoadingHistory, getMessageList } = useChatPages({
    chatId,
  });

  const noteAPI = useNoteAPI();

  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string | undefined>(
    undefined
  );
  const [chatFlowHistory, setChatFlowHistory] = useState<ChatFlowStep[]>([]);
  const [storySummary, setStorySummary] = useState<string>("");
  const [userPreferences, setUserPreferences] = useState<string>("");
  const [notesLoaded, setNotesLoaded] = useState<boolean>(false);

  // Load existing notes on initialization
  useEffect(() => {
    const loadExistingNotes = async () => {
      if (!noteAPI || !chatId || notesLoaded) return;

      try {
        const [summaryNote, preferencesNote] = await Promise.all([
          noteAPI.getNote(chatId, "story-summary"),
          noteAPI.getNote(chatId, "user-preferences"),
        ]);

        if (summaryNote) setStorySummary(summaryNote);
        if (preferencesNote) setUserPreferences(preferencesNote);
        setNotesLoaded(true);
      } catch (error) {
        console.error("Failed to load existing notes:", error);
        setNotesLoaded(true); // Still mark as loaded to prevent retries
      }
    };

    loadExistingNotes();
  }, [noteAPI, chatId, notesLoaded]);

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

  const generateAndSaveNotes = useCallback(
    async (messageList: Message[]) => {
      if (!noteAPI || !chatId || !grokChatApiClient) return;

      try {
        // Generate story summary
        const summaryPrompt = storySummary
          ? `${CHAT_FLOW_TEMPLATES.SUMMARY_UPDATE_PROMPT}\n\n${storySummary}`
          : CHAT_FLOW_TEMPLATES.SUMMARY_PROMPT;

        const summaryMessageList = [
          ...messageList,
          toSystemMessage(summaryPrompt),
        ];
        const newSummary = await grokChatApiClient.postChat(
          summaryMessageList,
          "low"
        );

        // Generate user preferences
        const preferencesPrompt = userPreferences
          ? `${CHAT_FLOW_TEMPLATES.USER_PREFERENCE_UPDATE_PROMPT}\n\n${userPreferences}`
          : CHAT_FLOW_TEMPLATES.USER_PREFERENCE_PROMPT;

        const preferencesMessageList = [
          ...messageList,
          toSystemMessage(preferencesPrompt),
        ];
        const newPreferences = await grokChatApiClient.postChat(
          preferencesMessageList,
          "low"
        );

        // Save notes to API and update local state
        await Promise.all([
          noteAPI.saveNote(chatId, "story-summary", newSummary),
          noteAPI.saveNote(chatId, "user-preferences", newPreferences),
        ]);

        setStorySummary(newSummary);
        setUserPreferences(newPreferences);
      } catch (error) {
        console.error("Failed to generate and save notes:", error);
      }
    },
    [noteAPI, chatId, grokChatApiClient, storySummary, userPreferences]
  );

  const appendNotesToChatHistory = useCallback(
    (messageList: Message[]): Message[] => {
      const notesMessages: Message[] = [];

      if (storySummary) {
        notesMessages.push(toSystemMessage(`Story Summary:\n${storySummary}`));
      }

      if (userPreferences) {
        notesMessages.push(
          toSystemMessage(`User Preferences:\n${userPreferences}`)
        );
      }

      return [...messageList, ...notesMessages];
    },
    [storySummary, userPreferences]
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

        // Append notes to chat history before planning
        localMessageList = appendNotesToChatHistory(localMessageList);

        // Step 1: Planning Notes
        setProgressStatus(PROGRESS_MESSAGES.PLANNING_NOTES);
        const planningNotesPrompt = CHAT_FLOW_TEMPLATES.PLANNING_NOTES_PROMPT;
        localMessageList.push(toSystemMessage(planningNotesPrompt));
        const planningNotesResponse = await grokChatApiClient.postChat(
          localMessageList,
          "low"
        );
        addChatFlowStep("planning_notes", planningNotesResponse);
        localMessageList.push(toSystemMessage(planningNotesResponse));

        // Step 2: Write Response
        setProgressStatus(PROGRESS_MESSAGES.RESPONSE_MESSAGE);
        const responsePrompt = CHAT_FLOW_TEMPLATES.RESPONSE_PROMPT;
        localMessageList.push(toSystemMessage(responsePrompt));
        const response = await grokChatApiClient.postChat(localMessageList);

        await addMessage(toSystemMessage(response));

        // Clear progress status and allow user to send next message immediately
        setProgressStatus(undefined);
        setIsSendingMessage(false);

        // Asynchronously generate and save notes (don't wait for completion)
        const baseMessageList = getMessageList();
        generateAndSaveNotes(baseMessageList).catch((error) => {
          console.error("Background note generation failed:", error);
        });
      } catch (error) {
        console.error("Error during ChatFlow submission:", error);
        setProgressStatus(undefined);
        setIsSendingMessage(false);
      }
    },
    [
      chatId,
      grokChatApiClient,
      addMessage,
      getMessageList,
      addChatFlowStep,
      appendNotesToChatHistory,
      generateAndSaveNotes,
    ]
  );

  return {
    pages,
    isSendingMessage,
    submitMessage,
    isLoadingHistory,
    progressStatus,
    chatFlowHistory,
    storySummary,
    userPreferences,
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
