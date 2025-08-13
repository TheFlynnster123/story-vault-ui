import { useState } from "react";
import { GrokChatAPI } from "../clients/GrokChatAPI";
import type { ChatManager } from "../Managers/ChatManager";
import { toSystemMessage } from "../utils/messageUtils";
import { useNotes } from "./useNotes";
import type { Note } from "../models/Note";
import { useMemories } from "./useMemories";
import type { Memory } from "../models/Memory";
import { useSystemSettings } from "./queries/useSystemSettings";
import type { Message } from "../pages/Chat/ChatMessage";
import { useChatSettings } from "./queries/useChatSettings";
import { FirstPersonCharacterPrompt } from "../templates/FirstPersonCharacterTemplate";

const RESPONSE_PROMPT: string =
  "Consider the above notes, write a response to the conversation. Provide your response directly without a preamble.";

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
    setIsLoading(true);
    setStatus("Generating response...");

    try {
      const basePrompt = getBasePrompt();
      const chatMessages = chatManager.getMessageList();
      const planningNotes = getPlanningNotes();

      const updatedPlanningNotes = await generatePlanningNoteContents(
        planningNotes,
        chatMessages
      );

      const finalPromptMessages = buildFinalPromptMessages(
        basePrompt,
        chatMessages,
        updatedPlanningNotes,
        memories
      );

      return await getFinalResponse(finalPromptMessages);
    } finally {
      setIsLoading(false);
      setStatus("Ready");
    }
  };

  const getBasePrompt = () => {
    if (chatSettings?.promptType == "Manual" && chatSettings?.customPrompt)
      return chatSettings.customPrompt;

    return FirstPersonCharacterPrompt;
  };

  const getPlanningNotes = () => {
    return notes.filter((n) => n.type === "planning");
  };

  const generatePlanningNoteContent = async (
    note: Note,
    chatMessages: Message[]
  ) => {
    const promptMessages: Message[] = [
      ...chatMessages,
      toSystemMessage(
        `#${note.name}\r\n
          ~ Consider the chat history above, and generate a note  note in Markdown without preamble or additional text ~
          ${note.prompt}
          \r\n
          =====
          \r\n`
      ),
    ];

    const response = await new GrokChatAPI(systemSettings).postChat(
      promptMessages
    );

    return { ...note, content: response };
  };

  const generatePlanningNoteContents = async (
    planningNotes: Note[],
    chatMessages: Message[]
  ): Promise<Note[]> => {
    const processPromises = planningNotes.map(
      async (note) => await generatePlanningNoteContent(note, chatMessages)
    );

    return await Promise.all(processPromises);
  };

  const buildNoteMessages = (updatedPlanningNotes: Note[]) => {
    return updatedPlanningNotes.map((note) =>
      toSystemMessage(`${note.name}\n${note.content ?? ""}`)
    );
  };

  const buildMemoryMessages = (memories: Memory[]) => {
    if (memories.length === 0) return [];

    const memoryContent = memories
      .map((memory) => memory.content)
      .filter((content) => content.trim().length > 0)
      .join("\r\n-");

    if (memoryContent.trim().length === 0) return [];

    return [toSystemMessage(`# Memories\r\n${memoryContent}`)];
  };

  const buildFinalPromptMessages = (
    basePrompt: string,
    chatMessages: Message[],
    notes: Note[],
    memories: Memory[]
  ): Message[] => {
    return [
      toSystemMessage(basePrompt),
      ...chatMessages,
      ...buildNoteMessages(notes),
      ...buildMemoryMessages(memories),
      toSystemMessage(RESPONSE_PROMPT),
    ];
  };

  const getFinalResponse = async (finalPromptMessages: Message[]) => {
    return await new GrokChatAPI(systemSettings).postChat(finalPromptMessages);
  };

  return { generateResponse, status, isLoading };
};
