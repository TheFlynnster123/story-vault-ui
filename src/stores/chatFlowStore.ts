import { create } from "zustand";
import type { Message } from "../Chat/ChatMessage";
import type { GrokChatAPI } from "../clients/GrokChatAPI";
import type { BlobAPI } from "../clients/BlobAPI";
import { toUserMessage, toSystemMessage } from "../utils/messageUtils";
import { GetPlanningNotesTemplate } from "../hooks/queries/usePlanningNotesTemplateQuery";

interface ChatFlowStore {
  // State
  isSendingMessage: boolean;

  // Dependencies
  grokClient?: GrokChatAPI;
  blobAPI?: BlobAPI;
  chatId?: string;

  // Actions
  initialize: (
    grokClient: GrokChatAPI,
    blobAPI: BlobAPI,
    chatId: string
  ) => void;
  submitMessage: (
    userMessageText: string,
    addMessage: (message: Message) => Promise<void>,
    getMessageList: () => Message[]
  ) => Promise<void>;
  reset: () => void;
}

export const useChatFlowStore = create<ChatFlowStore>((set, get) => ({
  // State
  isSendingMessage: false,

  // Dependencies
  grokClient: undefined,
  blobAPI: undefined,
  chatId: undefined,

  // Actions
  initialize: (grokClient: GrokChatAPI, blobAPI: BlobAPI, chatId: string) => {
    set({
      grokClient,
      blobAPI,
      chatId,
    });
  },

  submitMessage: async (
    userMessageText: string,
    addMessage: (message: Message) => Promise<void>,
    getMessageList: () => Message[]
  ) => {
    const { grokClient, blobAPI } = get();

    if (!grokClient || !blobAPI) {
      console.error("ChatFlow not properly initialized");
      return;
    }

    set({ isSendingMessage: true });

    // Add user message to the history
    await addMessage(toUserMessage(userMessageText));
    const messageList = getMessageList();

    // Get planning note templates
    const planningNoteTemplates = await GetPlanningNotesTemplate(blobAPI);

    // Generate planning notes
    const planningNotes: string[] = [];
    for (const template of planningNoteTemplates) {
      const consolidatedMessageList = GetConsolidatedMessageList(messageList);

      const planningNoteMessages = [
        consolidatedMessageList,
        toSystemMessage(template.name + "\r\n" + template.requestPrompt),
      ];

      const planningNote = await grokClient.postChat(planningNoteMessages);

      planningNotes.push(planningNote);
    }

    // Combine planning notes into a single context message
    const planningNotesContext = planningNotes.join("\n\n---\n\n");
    const contextMessage = toSystemMessage(planningNotesContext);

    // Generate the final response
    const messagePrompt = toSystemMessage(
      "Without preamble, take into consideration the notes above and respond to the user's most recent message."
    );
    const messagesForFinalResponse = [
      ...messageList,
      contextMessage,
      messagePrompt,
    ];
    const finalResponse = await grokClient.postChat(messagesForFinalResponse);

    // Add the final response to the history
    await addMessage(toSystemMessage(finalResponse));

    set({ isSendingMessage: false });
  },

  reset: () => {
    set({
      grokClient: undefined,
      blobAPI: undefined,
      chatId: undefined,
    });
  },
}));

const GetConsolidatedMessageList = (messageList: Message[]): Message => {
  return toSystemMessage(
    messageList
      .map((message) => {
        return `${message.role}: ${message.content}`;
      })
      .join("\n")
  );
};
