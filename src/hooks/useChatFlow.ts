import { GrokChatAPI } from "../clients/GrokChatAPI";
import type { ChatManager } from "../Managers/ChatManager";
import type { Message } from "../Chat/ChatMessage";
import { toSystemMessage } from "../utils/messageUtils";
import { useNotes } from "./useNotes";
import type { Note } from "../models/Note";

const DRAFT_RESPONSE_PROMPT: string =
  "Consider the above notes, and draft a response to the conversation. Provide your response directly without a preamble.";

const REFINEMENT_RESPONSE_PROMPT: string =
  "Consider the above notes, and create a final response to the conversation. Provide your response directly without a preamble.";

export interface IUseChatFlowProps {
  chatId: string;
  chatManager: ChatManager | null;
}

export const useChatFlow = ({ chatId, chatManager }: IUseChatFlowProps) => {
  const { notes, saveNotes } = useNotes(chatId);

  if (!chatManager) {
    return {
      generateResponse: async () => "",
    };
  }

  const processNotes = async (
    noteType: Note[],
    chatMessages: Message[],
    api: GrokChatAPI
  ) => {
    for (const note of noteType) {
      const promptMessages = [
        ...chatMessages,
        toSystemMessage(note.requestPrompt),
      ];
      const noteResponse = await api.postChat(promptMessages);
      note.content = noteResponse;

      chatMessages.push(toSystemMessage(noteResponse));

      await saveNotes(notes);
    }
  };

  const generateResponse = async () => {
    const api = new GrokChatAPI();
    let chatMessages = [...chatManager.getMessageList()];

    const planningNotes = notes.filter((n) => n.type === "planning");
    const refinementNotes = notes.filter((n) => n.type === "refinement");
    const analysisNotes = notes.filter((n) => n.type === "analysis");

    await processNotes(planningNotes, chatMessages, api);

    const planningContents = planningNotes.map((n) =>
      toSystemMessage(n.content)
    );
    const draftPromptMessages = [
      ...chatMessages,
      ...planningContents,
      toSystemMessage(DRAFT_RESPONSE_PROMPT),
    ];
    const draftResponse = await api.postChat(draftPromptMessages);
    chatMessages.push(toSystemMessage(draftResponse));

    await processNotes(refinementNotes, chatMessages, api);

    const refinementContents = refinementNotes.map((n) =>
      toSystemMessage(n.content)
    );

    const finalPromptMessages = [
      ...chatMessages,
      ...refinementContents,
      toSystemMessage(REFINEMENT_RESPONSE_PROMPT),
    ];

    const finalResponse = await api.postChat(finalPromptMessages);
    chatMessages.push(toSystemMessage(finalResponse));

    await processNotes(analysisNotes, chatMessages, api);

    await saveNotes(notes);

    return finalResponse;
  };

  return { generateResponse };
};
