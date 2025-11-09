import { useState } from "react";
import type { ChatCache } from "../Managers/ChatCache";
import { useNotes } from "./useNotes";
import { useMemories } from "./useMemories";
import { useSystemSettings } from "./queries/useSystemSettings";
import { useChatSettings } from "./queries/useChatSettings";
import { ChatFlow } from "../app/ChatFlow/ChatFlow";
import { PlanningNotesService } from "../app/ChatFlow/ChatFlowPlanningNotes";

export interface IUseChatFlowProps {
  chatId: string;
  chatCache: ChatCache | null;
}

export const useChatFlow = ({ chatId, chatCache }: IUseChatFlowProps) => {
  const { notes } = useNotes(chatId);
  const { memories } = useMemories(chatId);
  const [status, setStatus] = useState<string>("Ready");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { systemSettings } = useSystemSettings();
  const { chatSettings } = useChatSettings(chatId);

  if (!chatCache) {
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
      chatCache,
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
