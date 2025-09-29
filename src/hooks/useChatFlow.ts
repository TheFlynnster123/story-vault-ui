import { useState } from "react";
import type { ChatManager } from "../Managers/ChatManager";
import { useNotes } from "./useNotes";
import { useMemories } from "./useMemories";
import { useSystemSettings } from "./queries/useSystemSettings";
import { useChatSettings } from "./queries/useChatSettings";
import { ChatFlow } from "../app/ChatFlow/ChatFlow";
import { PlanningNotesService } from "../app/ChatFlow/ChatFlowPlanningNotes";

export interface IUseChatFlowProps {
  chatId: string;
  chatManager: ChatManager | null;
}

export const useChatFlow = ({ chatId, chatManager }: IUseChatFlowProps) => {
  const { notes } = useNotes(chatId);
  const { memories } = useMemories(chatId);
  const [status, setStatus] = useState<string>("Ready");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { systemSettings } = useSystemSettings();
  const { chatSettings } = useChatSettings(chatId);

  if (!chatManager) {
    return {
      generateResponse: async () => "",
      status: "Ready",
      isLoading: false,
    };
  }

  const generateResponse = async (): Promise<string> => {
    const planningNotesService = new PlanningNotesService(
      systemSettings as any,
      chatSettings as any
    );

    var chatFlow = new ChatFlow(
      chatManager,
      planningNotesService,
      notes,
      memories,
      systemSettings,
      chatSettings,
      setStatus,
      setIsLoading
    );

    return (await chatFlow.generateResponse()) ?? "";
  };

  return { generateResponse, status, isLoading };
};
