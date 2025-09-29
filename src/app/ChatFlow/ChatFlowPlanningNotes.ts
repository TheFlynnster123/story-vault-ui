import { GrokChatAPI } from "../../clients/GrokChatAPI";
import type { ChatSettings, Note, SystemSettings } from "../../models";
import type { Message } from "../../pages/Chat/ChatMessage";
import { toSystemMessage } from "../../utils/messageUtils";

export class PlanningNotesService {
  systemSettings: SystemSettings;
  chatSettings: ChatSettings;

  constructor(systemSettings: SystemSettings, chatSettings: ChatSettings) {
    this.systemSettings = systemSettings;
    this.chatSettings = chatSettings;
  }

  public generatePlanningNoteContents = async (
    planningNotes: Note[],
    chatMessages: Message[]
  ): Promise<Note[]> => {
    const processPromises = planningNotes.map(
      async (note) => await this.generatePlanningNoteContent(note, chatMessages)
    );

    return await Promise.all(processPromises);
  };

  generatePlanningNoteContent = async (note: Note, chatMessages: Message[]) => {
    const promptMessages: Message[] = [
      ...this.buildStoryMessages(),
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

    const response = await new GrokChatAPI(this.systemSettings).postChat(
      promptMessages
    );

    return { ...note, content: response };
  };

  buildStoryMessages = () => {
    if (!this.chatSettings?.story?.trim()) return [];
    return [toSystemMessage(`# Story\r\n${this.chatSettings.story}`)];
  };
}
