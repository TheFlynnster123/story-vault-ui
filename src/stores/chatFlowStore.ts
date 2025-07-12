import { create } from "zustand";
import type { Message } from "../Chat/ChatMessage";
import type { Note } from "../models/Note";
import type { ChatPage } from "../models/ChatPage";
import type { GrokChatAPI } from "../clients/GrokChatAPI";
import type { BlobAPI } from "../clients/BlobAPI";
import type { ChatHistoryAPI } from "../clients/ChatHistoryAPI";
import { ChatPageManager } from "../Managers/ChatPageManager";
import type { FlowStep, ChatFlowContext } from "./chatFlow/ChatFlowStates";
import { ChatFlowStateMachine } from "./chatFlow/ChatFlowStateMachine";

interface ChatFlowStore {
  // Message state (replaces useChatPages)
  messages: Message[];
  pages: ChatPage[];
  isLoadingHistory: boolean;

  // Flow state machine
  flowStep: FlowStep;
  planningNotesContext: Message | null;
  allNotes: Note[];

  // Dependencies
  chatId: string | null;
  grokClient?: GrokChatAPI;
  blobAPI?: BlobAPI;
  chatHistoryAPI?: ChatHistoryAPI;

  // Internal managers
  chatPageManager?: ChatPageManager;
  stateMachine?: ChatFlowStateMachine;

  // Computed state (for backwards compatibility)
  isGeneratingPlanningNotes: boolean;
  isGeneratingResponse: boolean;

  // Actions - One-stop shop
  initialize: (
    chatId: string,
    grokClient: GrokChatAPI,
    blobAPI: BlobAPI,
    chatHistoryAPI: ChatHistoryAPI
  ) => Promise<void>;
  addMessage: (message: Message) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  deleteMessagesFromIndex: (messageId: string) => Promise<void>;
  getDeletePreview: (messageId: string) => {
    messageCount: number;
    pageCount: number;
  };
  GetOrDefaultStateMachine: () => ChatFlowStateMachine | null;
  submitMessage: (userMessageText: string) => void;
  reset: () => void;
}

export const useChatFlowStore = create<ChatFlowStore>((set, get) => ({
  // Message state
  messages: [],
  pages: [],
  isLoadingHistory: false,

  // Flow state
  flowStep: "idle",
  planningNotesContext: null,
  allNotes: [],

  // Dependencies
  chatId: null,
  grokClient: undefined,
  blobAPI: undefined,
  chatHistoryAPI: undefined,
  chatPageManager: undefined,

  // Computed state (for backwards compatibility)
  isGeneratingPlanningNotes: false,
  isGeneratingResponse: false,

  // Actions
  initialize: async (
    chatId: string,
    grokClient: GrokChatAPI,
    blobAPI: BlobAPI,
    chatHistoryAPI: ChatHistoryAPI
  ) => {
    set({
      chatId,
      grokClient,
      blobAPI,
      chatHistoryAPI,
      isLoadingHistory: true,
    });

    try {
      console.log("yo");
      const fetchedPages = await chatHistoryAPI.getChatHistory(chatId);
      const chatPageManager = new ChatPageManager(chatId, fetchedPages);
      const messages = chatPageManager.getMessageList();

      set({
        pages: fetchedPages,
        messages,
        chatPageManager,
        isLoadingHistory: false,
      });
    } catch (error) {
      console.error("Failed to load chat history:", error);
      const chatPageManager = new ChatPageManager(chatId, []);
      set({
        pages: [],
        messages: [],
        chatPageManager,
        isLoadingHistory: false,
      });
    }
  },

  addMessage: async (message: Message) => {
    const { chatPageManager, chatHistoryAPI } = get();

    if (!chatPageManager || !chatHistoryAPI) {
      console.error("ChatFlow not properly initialized");
      return;
    }

    // Add message to page manager
    chatPageManager.addMessage(message);
    const updatedPages = chatPageManager.getPages();
    const updatedMessages = chatPageManager.getMessageList();

    set({
      pages: [...updatedPages],
      messages: [...updatedMessages],
    });

    // Save the last page to API
    const lastPage = updatedPages[updatedPages.length - 1];
    if (lastPage) {
      try {
        await chatHistoryAPI.saveChatPage(lastPage);
      } catch (error) {
        console.error("Failed to save page:", lastPage.pageId, error);
      }
    }
  },

  deleteMessage: async (messageId: string) => {
    const { chatPageManager, chatHistoryAPI } = get();

    if (!chatPageManager || !chatHistoryAPI) {
      console.error("ChatFlow not properly initialized");
      return;
    }

    const location = chatPageManager.findMessageLocation(messageId);
    if (!location) {
      console.warn(`Message with id ${messageId} not found`);
      return;
    }

    chatPageManager.deleteMessage(messageId);
    const updatedPages = chatPageManager.getPages();
    const updatedMessages = chatPageManager.getMessageList();

    set({
      pages: [...updatedPages],
      messages: [...updatedMessages],
    });

    // Save the affected page
    const affectedPage = updatedPages[location.pageIndex];
    if (affectedPage) {
      try {
        await chatHistoryAPI.saveChatPage(affectedPage);
      } catch (error) {
        console.error("Failed to save page:", affectedPage.pageId, error);
      }
    }
  },

  deleteMessagesFromIndex: async (messageId: string) => {
    const { chatPageManager, chatHistoryAPI } = get();

    if (!chatPageManager || !chatHistoryAPI) {
      console.error("ChatFlow not properly initialized");
      return;
    }

    const location = chatPageManager.findMessageLocation(messageId);
    if (!location) {
      console.warn(`Message with id ${messageId} not found`);
      return;
    }

    chatPageManager.deleteMessagesFromIndex(messageId);
    const updatedPages = chatPageManager.getPages();
    const updatedMessages = chatPageManager.getMessageList();

    set({
      pages: [...updatedPages],
      messages: [...updatedMessages],
    });

    // Save all affected pages
    const affectedPages = updatedPages.slice(location.pageIndex);
    for (const page of affectedPages) {
      try {
        await chatHistoryAPI.saveChatPage(page);
      } catch (error) {
        console.error("Failed to save page:", page.pageId, error);
      }
    }
  },

  getDeletePreview: (messageId: string) => {
    const { chatPageManager } = get();
    if (!chatPageManager) {
      return { messageCount: 0, pageCount: 0 };
    }
    return chatPageManager.countMessagesFromIndex(messageId);
  },

  GetOrDefaultStateMachine: () => {
    const { grokClient, blobAPI, stateMachine } = get();

    if (!grokClient || !blobAPI) {
      console.error("ChatFlow not properly initialized");
      return null;
    }

    if (!stateMachine) {
      const context: ChatFlowContext = {
        chatId: get().chatId ?? "",
        messages: get().messages,
        grokClient,
        blobAPI,
        addMessage: get().addMessage,
      };

      const newStateMachine = new ChatFlowStateMachine(
        context,
        (step: FlowStep, data?: any) => {
          set({
            flowStep: step,
            planningNotesContext:
              data?.planningNotesContext || get().planningNotesContext,
            allNotes: data?.allNotes || get().allNotes,
          });
        }
      );

      set({ stateMachine: newStateMachine });
      return newStateMachine;
    }

    return stateMachine;
  },

  submitMessage: (userMessageText: string) => {
    const stateMachine = get().GetOrDefaultStateMachine();
    stateMachine?.startMessageFlow(userMessageText);
  },

  reset: () => {
    set({
      messages: [],
      pages: [],
      isLoadingHistory: false,
      flowStep: "idle",
      planningNotesContext: null,
      chatId: null,
      grokClient: undefined,
      blobAPI: undefined,
      chatHistoryAPI: undefined,
      chatPageManager: undefined,
      stateMachine: undefined,
    });
  },
}));
