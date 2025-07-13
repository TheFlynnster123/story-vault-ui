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

  const getNotesByType = (type: Note["type"]) =>
    notes.filter((n) => n.type === type);

  const getPreviousAnalysisContents = (analysisNotes: Note[]) =>
    analysisNotes.map((n) => toSystemMessage(n.content));

  const processSingleNote = async (
    note: Note,
    baseMessages: Message[],
    previousAnalysis: Message[],
    api: GrokChatAPI
  ) => {
    const promptMessages = [
      ...baseMessages,
      ...previousAnalysis,
      toSystemMessage(note.requestPrompt || ""),
    ];
    const response = await api.postChat(promptMessages);
    return { note, response };
  };

  const processNotesInParallel = async (
    typeNotes: Note[],
    baseMessages: Message[],
    previousAnalysis: Message[],
    api: GrokChatAPI
  ) => {
    const promises = typeNotes.map((note) =>
      processSingleNote(note, baseMessages, previousAnalysis, api)
    );
    const results = await Promise.all(promises);
    const newMessages: Message[] = [];
    results.forEach(({ note, response }) => {
      note.content = response;
      newMessages.push(toSystemMessage(response));
    });
    await saveNotes(notes);
    return newMessages;
  };

  const generateDraft = async (
    chatMessages: Message[],
    planningContents: Message[],
    previousAnalysis: Message[],
    api: GrokChatAPI
  ) => {
    const promptMessages = [
      ...chatMessages,
      ...previousAnalysis,
      ...planningContents,
      toSystemMessage(DRAFT_RESPONSE_PROMPT),
    ];
    return await api.postChat(promptMessages);
  };

  const generateFinal = async (
    chatMessages: Message[],
    refinementContents: Message[],
    previousAnalysis: Message[],
    api: GrokChatAPI
  ) => {
    const promptMessages = [
      ...chatMessages,
      ...previousAnalysis,
      ...refinementContents,
      toSystemMessage(REFINEMENT_RESPONSE_PROMPT),
    ];
    return await api.postChat(promptMessages);
  };

  const generateResponse = async () => {
    const api = new GrokChatAPI();
    let chatMessages = [...chatManager.getMessageList()];

    const planningNotes = getNotesByType("planning");
    const refinementNotes = getNotesByType("refinement");
    const analysisNotes = getNotesByType("analysis");
    const previousAnalysis = getPreviousAnalysisContents(analysisNotes);

    // Process planning
    const planningNewMessages = await processNotesInParallel(
      planningNotes,
      chatMessages,
      previousAnalysis,
      api
    );
    chatMessages = [...chatMessages, ...planningNewMessages];
    const planningContents = planningNotes.map((n) =>
      toSystemMessage(n.content)
    );

    let draftResponse = "";
    if (refinementNotes.length > 0) {
      draftResponse = await generateDraft(
        chatMessages,
        planningContents,
        previousAnalysis,
        api
      );
      chatMessages.push(toSystemMessage(draftResponse));
    }

    // Process refinement
    const refinementNewMessages = await processNotesInParallel(
      refinementNotes,
      chatMessages,
      previousAnalysis,
      api
    );
    chatMessages = [...chatMessages, ...refinementNewMessages];
    const refinementContents = refinementNotes.map((n) =>
      toSystemMessage(n.content)
    );

    // Generate final
    const finalResponse = await generateFinal(
      chatMessages,
      refinementContents,
      previousAnalysis,
      api
    );
    chatMessages.push(toSystemMessage(finalResponse));

    // Process analysis
    const analysisNewMessages = await processNotesInParallel(
      analysisNotes,
      chatMessages,
      [], // No previous analysis for analysis itself?
      api
    );
    chatMessages = [...chatMessages, ...analysisNewMessages];

    await saveNotes(notes);

    return finalResponse;
  };

  return { generateResponse };
};
