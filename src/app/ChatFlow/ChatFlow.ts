import { GrokChatAPI } from "../../clients/GrokChatAPI";
import type { ChatManager } from "../../Managers/ChatManager";
import type { Note } from "../../models";
import type { Memory } from "../../models/Memory";
import type { Message } from "../../pages/Chat/ChatMessage";
import { FirstPersonCharacterPrompt } from "../../templates/FirstPersonCharacterTemplate";
import { toSystemMessage } from "../../utils/messageUtils";
import { d } from "../Dependencies/Dependencies";
import { PlanningNotesService } from "./ChatFlowPlanningNotes";

const RESPONSE_PROMPT: string =
  "Consider the above notes, write a response to the conversation. Provide your response directly without a preamble.";

export class ChatFlow {
  private chatManager: ChatManager;
  private planningNotesService: PlanningNotesService;

  private notes: Note[];
  private memories: Memory[];
  private systemSettings: any;
  private chatSettings: any;
  private setStatus: (status: string) => void;
  private setIsLoading: (isLoading: boolean) => void;

  constructor(
    chatManager: ChatManager,
    planningNotesService: PlanningNotesService,
    notes: Note[],
    memories: Memory[],
    systemSettings: any,
    chatSettings: any,
    setStatus: (status: string) => void,
    setIsLoading: (isLoading: boolean) => void
  ) {
    this.chatManager = chatManager;
    this.planningNotesService = planningNotesService;
    this.notes = notes;
    this.memories = memories;
    this.systemSettings = systemSettings;
    this.chatSettings = chatSettings;
    this.setStatus = setStatus;
    this.setIsLoading = setIsLoading;
  }

  async generateResponse() {
    this.setIsLoading(true);
    this.setStatus("Generating response...");

    try {
      const basePrompt = this.getBasePrompt();
      const chatMessages = this.chatManager.getMessageList();
      const planningNotes = this.getPlanningNotes();

      const updatedPlanningNotes =
        await this.planningNotesService.generatePlanningNoteContents(
          planningNotes,
          chatMessages
        );

      const finalPromptMessages = this.buildFinalPromptMessages(
        basePrompt,
        chatMessages,
        updatedPlanningNotes,
        this.memories
      );

      return await this.getFinalResponse(finalPromptMessages);
    } catch (e) {
      d.ErrorService().log("Failed to generate chat response", e as Error);
    } finally {
      this.setIsLoading(false);
      this.setStatus("Ready");
    }
  }

  getBasePrompt = () => {
    if (
      this.chatSettings?.promptType == "Manual" &&
      this.chatSettings?.customPrompt
    )
      return this.chatSettings.customPrompt;

    return FirstPersonCharacterPrompt;
  };

  getPlanningNotes = () => {
    return this.notes.filter((n) => n.type === "planning");
  };

  buildFinalPromptMessages = (
    basePrompt: string,
    chatMessages: Message[],
    notes: Note[],
    memories: Memory[]
  ): Message[] => {
    return [
      toSystemMessage(basePrompt),
      ...this.buildStoryMessages(),
      ...chatMessages,
      ...this.buildNoteMessages(notes),
      ...this.buildMemoryMessages(memories),
      toSystemMessage(RESPONSE_PROMPT),
    ];
  };

  getFinalResponse = async (finalPromptMessages: Message[]) => {
    return await new GrokChatAPI(this.systemSettings).postChat(
      finalPromptMessages
    );
  };

  buildNoteMessages = (updatedPlanningNotes: Note[]) => {
    return updatedPlanningNotes.map((note) =>
      toSystemMessage(`${note.name}\n${note.content ?? ""}`)
    );
  };

  buildMemoryMessages = (memories: Memory[]) => {
    if (memories.length === 0) return [];

    const memoryContent = memories
      .map((memory) => memory.content)
      .filter((content) => content.trim().length > 0)
      .join("\r\n-");

    if (memoryContent.trim().length === 0) return [];

    return [toSystemMessage(`# Memories\r\n${memoryContent}`)];
  };

  buildStoryMessages = () => {
    if (!this.chatSettings?.story?.trim()) return [];
    return [toSystemMessage(`# Story\r\n${this.chatSettings.story}`)];
  };
}
