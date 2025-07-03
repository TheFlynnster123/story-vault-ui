import type { ChatPage } from "../models/ChatPage";
import type { PreResponseNote, PostResponseNote } from "../models";
import { useChatFlow } from "./useChatFlow";

interface UseChatReturn {
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
  chatFlowHistory?: import("./useChatFlow").ChatFlowStep[];
  preResponseNotes: PreResponseNote[];
  postResponseNotes: PostResponseNote[];
}

interface UseChatProps {
  chatId: string;
}

export const useChat = ({ chatId }: UseChatProps): UseChatReturn => {
  // Use ChatFlow for the new multi-step process
  const {
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
  } = useChatFlow({ chatId });

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
  };
};
