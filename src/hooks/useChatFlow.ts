import { useState } from "react";
import { GrokChatAPI } from "../clients/GrokChatAPI";
import type { ChatManager } from "../Managers/ChatManager";
import type { Message } from "../Chat/ChatMessage";
import { toSystemMessage } from "../utils/messageUtils";
import { useNotes } from "./useNotes";
import type { Note } from "../models/Note";

const DRAFT_RESPONSE_PROMPT: string =
  "Consider the above notes, and draft a response to the conversation. Provide your response directly without a preamble.";

const REFINEMENT_RESPONSE_PROMPT: string =
  "Consider the above notes, and create a final response to the conversation. Respond directly with only the finalized message. Provide your response without a preamble or supporting data.";

export interface IUseChatFlowProps {
  chatId: string;
  chatManager: ChatManager | null;
}

export const useChatFlow = ({ chatId, chatManager }: IUseChatFlowProps) => {
  const { notes, saveNotes } = useNotes(chatId);
  const [status, setStatus] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!chatManager) {
    return {
      generateResponse: async () => "",
      status: "Ready",
    };
  }

  const getNotesByType = (type: Note["type"]) =>
    notes.filter((n) => n.type === type);

  const processSingleNote = async (
    note: Note,
    baseMessages: Message[],
    api: GrokChatAPI
  ) => {
    const promptMessages = [
      ...baseMessages,
      toSystemMessage(
        note.name +
          "\r\n" +
          "Respond with just bullet points, no preamble or draft message." +
          "\r\n" +
          note.requestPrompt
      ),
    ];
    const response = await api.postChat(promptMessages);
    return { note, response };
  };

  const processNotesInParallel = async (
    typeNotes: Note[],
    baseMessages: Message[],
    api: GrokChatAPI
  ): Promise<void> => {
    const promises = typeNotes.map((note) =>
      processSingleNote(note, baseMessages, api)
    );
    const results = await Promise.all(promises);
    results.forEach(({ note, response }) => {
      note.content = response;
    });
    await saveNotes(notes);
  };

  const processPhase = async (
    typeNotes: Note[],
    chatMessages: Message[],
    api: GrokChatAPI
  ): Promise<Note[]> => {
    await processNotesInParallel(typeNotes, chatMessages, api);
    return typeNotes;
  };

  const generateAuxiliaryResponse = async (
    chatMessages: Message[],
    additionalContents: Message[],
    prompt: string,
    api: GrokChatAPI
  ) => {
    const promptMessages = [
      ...chatMessages,
      ...additionalContents,
      toSystemMessage(prompt),
    ];
    return await api.postChat(promptMessages);
  };

  const generatePlanningNotes = async (
    chatMessages: Message[],
    api: GrokChatAPI
  ): Promise<Note[]> => {
    setStatus("Planning response...");
    const typeNotes = getNotesByType("planning");
    return await processPhase(typeNotes, chatMessages, api);
  };

  const generateDraftMessage = async (
    chatMessages: Message[],
    planningNotes: Note[],
    api: GrokChatAPI
  ): Promise<string> => {
    setStatus("Drafting response...");
    const refinementNotes = getNotesByType("refinement");
    if (refinementNotes.length === 0) {
      return "";
    }
    const planningContents = planningNotes.map((n) =>
      toSystemMessage(n.content)
    );
    return await generateAuxiliaryResponse(
      chatMessages,
      planningContents,
      DRAFT_RESPONSE_PROMPT,
      api
    );
  };

  const generateRefinementNotes = async (
    chatMessages: Message[],
    api: GrokChatAPI
  ): Promise<Note[]> => {
    setStatus("Generating refinement notes...");
    const typeNotes = getNotesByType("refinement");
    var result = await processPhase(typeNotes, chatMessages, api);
    setStatus("Refinement notes generated...");
    return result;
  };

  const generateRefinedMessage = async (
    chatMessages: Message[],
    refinementNotes: Note[],
    api: GrokChatAPI
  ): Promise<string> => {
    setStatus("Generating refined message...");
    const refinementContents = refinementNotes.map((n) =>
      toSystemMessage(n.content)
    );
    return await generateAuxiliaryResponse(
      chatMessages,
      refinementContents,
      REFINEMENT_RESPONSE_PROMPT,
      api
    );
  };

  const generateAnalysisNotes = async (
    chatMessages: Message[],
    api: GrokChatAPI
  ): Promise<Note[]> => {
    setStatus("Generating post-response analysis notes...");
    const typeNotes = getNotesByType("analysis");

    var result = await processPhase(typeNotes, chatMessages, api);
    setStatus("Finished");
    return result;
  };

  const noteToSystemMessage = (note: Note) => {
    return toSystemMessage(note.name + "\r\n" + note.content);
  };

  const notesToSystemMessages = (notes: Note[]) => {
    return notes.map((note) => noteToSystemMessage(note));
  };

  const clearExistingNoteContent = async () => {
    notes.forEach((note) => {
      note.content = "";
    });
    await saveNotes(notes);
  };

  const generateResponse = async () => {
    setIsLoading(true);
    const api = new GrokChatAPI();
    const chatMessages = chatManager.getMessageList();

    const analysisNotes = getNotesByType("analysis");
    chatMessages.push(...notesToSystemMessages(analysisNotes));

    await clearExistingNoteContent();

    const planningNotes = await generatePlanningNotes(chatMessages, api);
    chatMessages.push(...notesToSystemMessages(planningNotes));

    const draft = await generateDraftMessage(chatMessages, planningNotes, api);
    if (draft) chatMessages.push(toSystemMessage(draft));

    const refinementNotes = await generateRefinementNotes(chatMessages, api);
    chatMessages.push(...notesToSystemMessages(refinementNotes));

    const refinedMessage = await generateRefinedMessage(
      chatMessages,
      refinementNotes,
      api
    );

    chatMessages.push(toSystemMessage(refinedMessage));
    setIsLoading(false);

    generateAnalysisNotes(chatMessages, api);

    setStatus("Finished");
    return refinedMessage;
  };

  return { generateResponse, status, isLoading };
};
