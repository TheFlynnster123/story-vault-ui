import { useGrokChatAPI } from "./useGrokChatAPI";
import { useChatPages } from "./useChatPages";
import type { Message } from "../Chat/ChatMessage";
import { useCallback, useState, useEffect } from "react";
import {
  type ChatPage,
  type PreResponseNote,
  type PostResponseNote,
  PlanningNote,
} from "../models";
import { toUserMessage, toSystemMessage } from "../utils/messageUtils";
import {
  CHAT_FLOW_TEMPLATES,
  PROGRESS_MESSAGES,
  CHAT_FLOW_CONFIG,
} from "../constants/chatFlow";
import { useBlobAPI } from "./useBlobAPI";
import { StorySummaryNote } from "../models/StorySummaryNote";
import { UserPreferencesNote } from "../models/UserPreferencesNote";
import { useChatSettings } from "./useChatSettings";
import { useChatSettingsQuery } from "./queries/useChatSettingsQuery";

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
  deleteMessage: (messageId: string) => Promise<void>;
  deleteMessagesFromIndex: (messageId: string) => Promise<void>;
  getDeletePreview: (messageId: string) => {
    messageCount: number;
    pageCount: number;
  };
  isLoadingHistory: boolean;
  progressStatus?: string;
  chatFlowHistory: ChatFlowStep[];
  preResponseNotes: PreResponseNote[];
  postResponseNotes: PostResponseNote[];
  deleteNotes: () => Promise<void>;
}

interface UseChatFlowProps {
  chatId: string;
}

export const useChatFlow = ({
  chatId,
}: UseChatFlowProps): UseChatFlowReturn => {
  const { grokChatApiClient } = useGrokChatAPI();

  const {
    pages,
    addMessage,
    deleteMessage,
    deleteMessagesFromIndex,
    getDeletePreview,
    isLoadingHistory,
    getMessageList,
  } = useChatPages({
    chatId,
  });

  const blobAPI = useBlobAPI();
  const chatSettings = useChatSettingsQuery(chatId);

  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string | undefined>(
    undefined
  );
  const [chatFlowHistory, setChatFlowHistory] = useState<ChatFlowStep[]>([]);
  const [notesLoaded, setNotesLoaded] = useState<boolean>(false);

  // Blob instances
  const [preResponseNotes] = useState<PreResponseNote[]>([]);
  const [postResponseNotes, setPostResponseNotes] = useState<
    PostResponseNote[]
  >([]);

  // Initialize post-response note instances
  useEffect(() => {
    const initializeNotes = async () => {
      if (!blobAPI || !chatId || !grokChatApiClient || notesLoaded) return;

      try {
        // Create post-response note instances
        const storySummaryPostNote = new StorySummaryNote(
          blobAPI,
          chatId,
          grokChatApiClient
        );
        const userPreferencesPostNote = new UserPreferencesNote(
          blobAPI,
          chatId,
          grokChatApiClient
        );

        await Promise.all([
          storySummaryPostNote.load(),
          userPreferencesPostNote.load(),
        ]);

        setPostResponseNotes([storySummaryPostNote, userPreferencesPostNote]);
        setNotesLoaded(true);
      } catch (error) {
        console.error("Failed to initialize notes:", error);
        setNotesLoaded(true); // Still mark as loaded to prevent retries
      }
    };

    initializeNotes();
  }, [blobAPI, chatId, grokChatApiClient, notesLoaded]);

  // Check for chat settings and add context as first message if needed
  useEffect(() => {
    const addContextMessage = async () => {
      if (
        !chatSettings ||
        !chatSettings.context ||
        isLoadingHistory ||
        pages.length > 0
      ) {
        return;
      }

      const contextMessage = toSystemMessage(
        `Story Context: ${chatSettings.context}`
      );
      await addMessage(contextMessage);
    };

    addContextMessage();
  }, [chatSettings, isLoadingHistory, pages, addMessage]);

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

  const updatePostResponseNotes = useCallback(
    async (messageList: Message[]) => {
      if (!grokChatApiClient || postResponseNotes.length === 0) return;

      try {
        await Promise.all(
          postResponseNotes.map((note) => note.generateAndSave(messageList))
        );

        setPostResponseNotes([...postResponseNotes]);
      } catch (error) {
        console.error("Failed to generate and save notes:", error);
      }
    },
    [grokChatApiClient, postResponseNotes]
  );

  const appendNotesToContext = useCallback(
    (messageList: Message[], notes: PostResponseNote[]): Message[] => {
      // Get all note context messages that have content
      const noteContextMessages: Message[] = [];
      for (const note of notes) {
        if (note.hasContent()) {
          const contextMessage = note.getContextMessage();
          if (contextMessage) {
            noteContextMessages.push(contextMessage);
          }
        }
      }

      // If no notes to add, return original list
      if (noteContextMessages.length === 0) {
        return messageList;
      }

      // Calculate insertion point: configurable offset from the end
      const insertionIndex = Math.max(
        0,
        messageList.length - CHAT_FLOW_CONFIG.NOTE_INSERTION_OFFSET
      );

      // Create new array with notes inserted at the calculated position
      const result = [...messageList];
      result.splice(insertionIndex, 0, ...noteContextMessages);

      return result;
    },
    []
  );

  const deleteNotes = useCallback(async () => {
    if (!blobAPI || !chatId || postResponseNotes.length === 0) {
      console.error("BlobAPI, chatId, or notes not available for deletion.");
      return;
    }

    try {
      // Delete all post-response notes from storage
      await Promise.all(
        postResponseNotes.map((note) =>
          blobAPI.deleteBlob(chatId, note.getNoteName())
        )
      );

      // Clear the content of each note instance locally
      postResponseNotes.forEach((note) => {
        note.setContent("");
      });

      // Update the state to trigger a re-render
      setPostResponseNotes([...postResponseNotes]);
    } catch (error) {
      console.error("Failed to delete notes:", error);
      throw error;
    }
  }, [blobAPI, chatId, postResponseNotes]);

  const submitMessage = useCallback(
    async (userMessageText: string) => {
      if (!chatId || !grokChatApiClient || !blobAPI) {
        console.error("ChatId, Grok API client, or Blob API not available.");
        return;
      }

      setIsSendingMessage(true);
      setChatFlowHistory([]); // Clear previous flow history

      try {
        // Add user message to formal chat history
        await addMessage(toUserMessage(userMessageText));
        let localMessageList = getMessageList();

        // Append post-response notes to chat history using note instances
        localMessageList = appendNotesToContext(
          localMessageList,
          postResponseNotes
        );

        // Step 1: Generate Planning Notes using PlanningPreResponseNote
        setProgressStatus(PROGRESS_MESSAGES.PLANNING_NOTES);
        const planningNote = new PlanningNote(grokChatApiClient);
        await planningNote.generate(localMessageList, true);
        localMessageList = planningNote.appendToContext(localMessageList);
        addChatFlowStep("planning_notes", planningNote.getContent());

        // Step 2: Write Response
        setProgressStatus(PROGRESS_MESSAGES.RESPONSE_MESSAGE);
        const responsePrompt = CHAT_FLOW_TEMPLATES.RESPONSE_PROMPT;
        localMessageList.push(toSystemMessage(responsePrompt));
        const response = await grokChatApiClient.postChat(localMessageList);

        await addMessage(toSystemMessage(response));

        setProgressStatus(undefined);
        setIsSendingMessage(false);

        // Step 3: Genereate post response notes
        const baseMessageList = getMessageList();
        updatePostResponseNotes(baseMessageList)
          .catch((error) => {
            console.error("Background note generation failed:", error);
          })
          .then(() => {});
      } catch (error) {
        console.error("Error during ChatFlow submission:", error);
        setProgressStatus(undefined);
        setIsSendingMessage(false);
      }
    },
    [
      chatId,
      grokChatApiClient,
      blobAPI,
      addMessage,
      getMessageList,
      addChatFlowStep,
      updatePostResponseNotes,
      postResponseNotes,
      appendNotesToContext,
    ]
  );

  return {
    pages,
    isSendingMessage,
    submitMessage,
    deleteMessage,
    deleteMessagesFromIndex,
    getDeletePreview,
    isLoadingHistory,
    progressStatus,
    chatFlowHistory,
    preResponseNotes,
    postResponseNotes,
    deleteNotes,
  };
};
