import { create } from "zustand";
import type { Message } from "../Chat/ChatMessage";
import type { GrokChatAPI } from "../clients/GrokChatAPI";
import type { BlobAPI } from "../clients/BlobAPI";
import { PlanningNote, RefinementNote, AnalysisNote } from "../models";
import { toUserMessage, toSystemMessage } from "../utils/messageUtils";
import {
  CHAT_FLOW_V2_TEMPLATES,
  CHAT_FLOW_V2_PROGRESS_MESSAGES,
  CHAT_FLOW_V2_CONFIG,
  type ChatFlowV2State,
  type ChatFlowV2Step,
} from "../constants/chatFlowV2";

interface ChatFlowV2Store {
  // State
  currentState: ChatFlowV2State;
  progressStatus?: string;
  chatFlowHistory: ChatFlowV2Step[];
  error?: string;

  // Notes
  planningNote?: PlanningNote;
  refinementNote?: RefinementNote;
  analysisNote?: AnalysisNote;

  // Messages
  currentUserMessage?: string;
  currentSystemMessage?: string;
  currentRefinedMessage?: string;

  // Dependencies
  grokClient?: GrokChatAPI;
  blobAPI?: BlobAPI;
  chatId?: string;

  // Actions
  initialize: (
    grokClient: GrokChatAPI,
    blobAPI: BlobAPI,
    chatId: string
  ) => Promise<void>;
  submitMessage: (
    userMessageText: string,
    messageList: Message[],
    addMessage: (message: Message) => Promise<void>,
    getMessageList: () => Message[]
  ) => Promise<void>;
  reset: () => void;

  // Internal actions
  setState: (state: ChatFlowV2State) => void;
  setProgressStatus: (status?: string) => void;
  addChatFlowStep: (
    stepType: ChatFlowV2Step["stepType"],
    content: string
  ) => void;
  setError: (error: string) => void;
  clearError: () => void;
}

export const useChatFlowV2Store = create<ChatFlowV2Store>((set, get) => ({
  // Initial state
  currentState: "idle",
  progressStatus: undefined,
  chatFlowHistory: [],
  error: undefined,

  // Notes
  planningNote: undefined,
  refinementNote: undefined,
  analysisNote: undefined,

  // Messages
  currentUserMessage: undefined,
  currentSystemMessage: undefined,
  currentRefinedMessage: undefined,

  // Dependencies
  grokClient: undefined,
  blobAPI: undefined,
  chatId: undefined,

  // Actions
  initialize: async (
    grokClient: GrokChatAPI,
    blobAPI: BlobAPI,
    chatId: string
  ) => {
    try {
      set({
        grokClient,
        blobAPI,
        chatId,
        currentState: "idle",
        error: undefined,
      });

      // Initialize notes
      const planningNote = new PlanningNote(grokClient);
      const refinementNote = new RefinementNote(grokClient);
      const analysisNote = new AnalysisNote(blobAPI, chatId, grokClient);

      // Load existing post-response notes
      await analysisNote.load();

      set({
        planningNote,
        refinementNote,
        analysisNote,
      });
    } catch (error) {
      console.error("Failed to initialize ChatFlow v2:", error);
      set({ error: `Initialization failed: ${error}`, currentState: "error" });
    }
  },

  submitMessage: async (
    userMessageText: string,
    _messageList: Message[],
    addMessage: (message: Message) => Promise<void>,
    getMessageList: () => Message[]
  ) => {
    const state = get();
    const {
      grokClient,
      blobAPI,
      chatId,
      planningNote,
      refinementNote,
      analysisNote,
      setState,
      setProgressStatus,
      addChatFlowStep,
      setError,
    } = state;

    if (!grokClient || !blobAPI || !chatId) {
      setError("ChatFlow not properly initialized");
      return;
    }

    if (!planningNote || !refinementNote || !analysisNote) {
      setError("Notes not properly initialized");
      return;
    }

    try {
      setState("processing_user_message");
      setProgressStatus(CHAT_FLOW_V2_PROGRESS_MESSAGES.PROCESSING_USER_MESSAGE);

      // Clear previous flow history
      set({ chatFlowHistory: [], error: undefined });

      // Add user message to formal chat history
      await addMessage(toUserMessage(userMessageText));
      set({ currentUserMessage: userMessageText });

      let localMessageList = getMessageList();

      // Append existing post-response notes to context
      const postResponseNotes = [];
      if (analysisNote.hasContent()) {
        postResponseNotes.push(analysisNote);
      }

      localMessageList = appendNotesToContext(
        localMessageList,
        postResponseNotes
      );

      // Step 1: Generate Planning Notes
      setState("generating_planning_notes");
      setProgressStatus(
        CHAT_FLOW_V2_PROGRESS_MESSAGES.GENERATING_PLANNING_NOTES
      );

      await planningNote.generate(
        localMessageList,
        CHAT_FLOW_V2_CONFIG.CONSOLIDATE_MESSAGES
      );
      localMessageList = planningNote.appendToContext(localMessageList);
      addChatFlowStep("planning_notes", planningNote.getContent());

      // Step 2: Generate System Message
      setState("generating_system_message");
      setProgressStatus(
        CHAT_FLOW_V2_PROGRESS_MESSAGES.GENERATING_SYSTEM_MESSAGE
      );

      const systemPrompt = CHAT_FLOW_V2_TEMPLATES.SYSTEM_MESSAGE_PROMPT;
      localMessageList.push(toSystemMessage(systemPrompt));
      const systemResponse = await grokClient.postChat(localMessageList);

      await addMessage(toSystemMessage(systemResponse));
      set({ currentSystemMessage: systemResponse });
      addChatFlowStep("system_message", systemResponse);

      // Step 3: Generate Refinement Notes (if enabled)
      if (CHAT_FLOW_V2_CONFIG.ENABLE_REFINEMENT) {
        setState("generating_refinement_notes");
        setProgressStatus(
          CHAT_FLOW_V2_PROGRESS_MESSAGES.GENERATING_REFINEMENT_NOTES
        );

        // Update message list to include the system response
        localMessageList = getMessageList();
        await refinementNote.generate(
          localMessageList,
          CHAT_FLOW_V2_CONFIG.CONSOLIDATE_MESSAGES
        );
        addChatFlowStep("refinement_notes", refinementNote.getContent());

        // Step 4: Generate Refined Message
        setState("generating_refined_message");
        setProgressStatus(
          CHAT_FLOW_V2_PROGRESS_MESSAGES.GENERATING_REFINED_MESSAGE
        );

        localMessageList = refinementNote.appendToContext(localMessageList);
        const refinedPrompt = CHAT_FLOW_V2_TEMPLATES.REFINED_MESSAGE_PROMPT;
        localMessageList.push(toSystemMessage(refinedPrompt));
        const refinedResponse = await grokClient.postChat(localMessageList);

        await addMessage(toSystemMessage(refinedResponse));
        set({ currentRefinedMessage: refinedResponse });
        addChatFlowStep("refined_message", refinedResponse);
      }

      // Step 5: Generate Analysis Notes (if enabled)
      if (CHAT_FLOW_V2_CONFIG.ENABLE_ANALYSIS) {
        setState("generating_analysis_notes");
        setProgressStatus(
          CHAT_FLOW_V2_PROGRESS_MESSAGES.GENERATING_ANALYSIS_NOTES
        );

        const finalMessageList = getMessageList();
        await analysisNote.generateAndSave(finalMessageList);
        addChatFlowStep("analysis_notes", analysisNote.getContent());

        // No additional post-response notes to update in v2
      }

      setState("complete");
      setProgressStatus(CHAT_FLOW_V2_PROGRESS_MESSAGES.COMPLETE);

      // Clear progress status after a delay
      setTimeout(() => {
        setProgressStatus(undefined);
        setState("idle");
      }, 2000);
    } catch (error) {
      console.error("Error during ChatFlow v2 submission:", error);
      setError(`ChatFlow error: ${error}`);
      setState("error");
      setProgressStatus(undefined);
    }
  },

  reset: () => {
    set({
      currentState: "idle",
      progressStatus: undefined,
      chatFlowHistory: [],
      error: undefined,
      currentUserMessage: undefined,
      currentSystemMessage: undefined,
      currentRefinedMessage: undefined,
    });
  },

  // Internal actions
  setState: (state: ChatFlowV2State) => set({ currentState: state }),

  setProgressStatus: (status?: string) => set({ progressStatus: status }),

  addChatFlowStep: (stepType: ChatFlowV2Step["stepType"], content: string) => {
    const step: ChatFlowV2Step = {
      id: `${stepType}-${Date.now()}`,
      stepType,
      content,
      timestamp: Date.now(),
    };
    set((state) => ({
      chatFlowHistory: [...state.chatFlowHistory, step],
    }));
  },

  setError: (error: string) => set({ error, currentState: "error" }),

  clearError: () => set({ error: undefined }),
}));

// Helper functions
const appendNotesToContext = (
  messageList: Message[],
  notes: Array<{ hasContent(): boolean; getContextMessage(): Message | null }>
): Message[] => {
  const noteContextMessages: Message[] = [];
  for (const note of notes) {
    if (note.hasContent()) {
      const contextMessage = note.getContextMessage();
      if (contextMessage) {
        noteContextMessages.push(contextMessage);
      }
    }
  }

  if (noteContextMessages.length === 0) {
    return messageList;
  }

  const insertionIndex = Math.max(
    0,
    messageList.length - CHAT_FLOW_V2_CONFIG.NOTE_INSERTION_OFFSET
  );

  const result = [...messageList];
  result.splice(insertionIndex, 0, ...noteContextMessages);

  return result;
};

const updatePostResponseNotes = async (
  messageList: Message[],
  notes: Array<{ generateAndSave(messageList: Message[]): Promise<void> }>
): Promise<void> => {
  try {
    await Promise.all(notes.map((note) => note.generateAndSave(messageList)));
  } catch (error) {
    console.error("Failed to update post-response notes:", error);
    throw error;
  }
};
