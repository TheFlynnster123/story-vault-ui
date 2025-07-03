import { useGrokChatAPI } from "./useGrokChatAPI";
import { useChatPages } from "./useChatPages";
import type { Message } from "../Chat/ChatMessage";
import { useCallback, useState, useEffect } from "react";
import { useNoteAPI } from "./useNoteAPI";
import {
  type ChatPage,
  type PreResponseNote,
  type PostResponseNote,
  StorySummaryPreNote,
  UserPreferencesPreNote,
  StorySummaryNote,
  UserPreferencesNote,
} from "../models";

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

  // Note class instances
  const [preResponseNotes, setPreResponseNotes] = useState<PreResponseNote[]>(
    []
  );
  const [postResponseNotes, setPostResponseNotes] = useState<
    PostResponseNote[]
  >([]);

  // Initialize note instances
  useEffect(() => {
    const initializeNotes = async () => {
      if (!noteAPI || !chatId || notesLoaded) return;

      try {
        // Create pre-response note instances
        const storySummaryPreNote = new StorySummaryPreNote(noteAPI, chatId);
        const userPreferencesPreNote = new UserPreferencesPreNote(
          noteAPI,
          chatId
        );

        // Create post-response note instances
        const storySummaryPostNote = new StorySummaryNote(noteAPI, chatId);
        const userPreferencesPostNote = new UserPreferencesNote(
          noteAPI,
          chatId
        );

        // Load existing content
        await Promise.all([
          storySummaryPreNote.load(),
          userPreferencesPreNote.load(),
        ]);

        // Set initial content for post-response notes
        storySummaryPostNote.setContent(storySummaryPreNote.getContent());
        userPreferencesPostNote.setContent(userPreferencesPreNote.getContent());

        // Update state
        setPreResponseNotes([storySummaryPreNote, userPreferencesPreNote]);
        setPostResponseNotes([storySummaryPostNote, userPreferencesPostNote]);

        // Keep backward compatibility with existing state
        setStorySummary(storySummaryPreNote.getContent());
        setUserPreferences(userPreferencesPreNote.getContent());
        setNotesLoaded(true);
      } catch (error) {
        console.error("Failed to initialize notes:", error);
        setNotesLoaded(true); // Still mark as loaded to prevent retries
      }
    };

    initializeNotes();
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
      if (!grokChatApiClient || postResponseNotes.length === 0) return;

      try {
        // Generate and save all post-response notes
        await Promise.all(
          postResponseNotes.map((note) =>
            note.generateAndSave(messageList, grokChatApiClient)
          )
        );

        // Update backward compatibility state
        const summaryNote = postResponseNotes.find(
          (note) => note.getNoteName() === "story-summary"
        );
        const preferencesNote = postResponseNotes.find(
          (note) => note.getNoteName() === "user-preferences"
        );

        if (summaryNote) setStorySummary(summaryNote.getContent());
        if (preferencesNote) setUserPreferences(preferencesNote.getContent());

        // Update pre-response notes with new content for next iteration
        const updatedPreResponseNotes = preResponseNotes.map((preNote) => {
          const correspondingPostNote = postResponseNotes.find(
            (postNote) => postNote.getNoteName() === preNote.getNoteName()
          );
          if (correspondingPostNote) {
            // Create a new instance with updated content
            if (preNote.getNoteName() === "story-summary") {
              const newPreNote = new StorySummaryPreNote(noteAPI!, chatId);
              newPreNote.setContent(correspondingPostNote.getContent());
              return newPreNote;
            } else if (preNote.getNoteName() === "user-preferences") {
              const newPreNote = new UserPreferencesPreNote(noteAPI!, chatId);
              newPreNote.setContent(correspondingPostNote.getContent());
              return newPreNote;
            }
          }
          return preNote;
        });

        setPreResponseNotes(updatedPreResponseNotes);
      } catch (error) {
        console.error("Failed to generate and save notes:", error);
      }
    },
    [grokChatApiClient, postResponseNotes, preResponseNotes, noteAPI, chatId]
  );

  const appendNotesToChatHistory = useCallback(
    (messageList: Message[]): Message[] => {
      let updatedMessageList = messageList;

      // Use note classes to append context
      for (const note of preResponseNotes) {
        updatedMessageList = note.appendToContext(updatedMessageList);
      }

      return updatedMessageList;
    },
    [preResponseNotes]
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
