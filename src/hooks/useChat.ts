import type { ChatPage } from "../models/ChatPage";
import { useChatFlow } from "./useChatFlow";

interface UseChatReturn {
  pages: ChatPage[];
  isSendingMessage: boolean;
  submitMessage: (messageText: string) => Promise<void>;
  isLoadingHistory: boolean;
  progressStatus?: string;
  chatFlowHistory?: import("./useChatFlow").ChatFlowStep[];
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
    isLoadingHistory,
    progressStatus,
    chatFlowHistory,
  } = useChatFlow({ chatId });

  return {
    pages,
    isSendingMessage,
    submitMessage,
    isLoadingHistory,
    progressStatus,
    chatFlowHistory,
  };
};
