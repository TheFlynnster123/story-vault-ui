import type { Message } from "../../Chat/ChatMessage";
import type { Note } from "../../models/Note";
import type { GrokChatAPI } from "../../clients/GrokChatAPI";
import type { BlobAPI } from "../../clients/BlobAPI";
import { toUserMessage, toSystemMessage } from "../../utils/messageUtils";
import { GetPlanningNotesTemplate } from "../../hooks/queries/usePlanningNotesTemplateQuery";

export type FlowStep =
  | "idle"
  | "generating-planning-notes"
  | "generating-response"
  | "complete";

export interface ChatFlowContext {
  messages: Message[];
  grokClient: GrokChatAPI;
  blobAPI: BlobAPI;
  addMessage: (message: Message) => Promise<void>;
}

export interface StateTransition {
  nextStep: FlowStep;
  data?: any;
}

export abstract class ChatFlowState {
  abstract execute(context: ChatFlowContext): Promise<StateTransition>;
}

export class IdleState extends ChatFlowState {
  async execute(_: ChatFlowContext): Promise<StateTransition> {
    // Removed unused parameter
    // Idle state - waiting for user input
    return { nextStep: "idle" };
  }
}

export class GeneratingPlanningNotesState extends ChatFlowState {
  private userMessageText: string;

  constructor(userMessageText: string) {
    super();
    this.userMessageText = userMessageText;
  }

  async execute(context: ChatFlowContext): Promise<StateTransition> {
    try {
      // Add user message first
      await context.addMessage(toUserMessage(this.userMessageText));

      // Get planning note templates
      const planningNoteTemplates = await GetPlanningNotesTemplate(
        context.blobAPI
      );

      // Generate planning notes
      const allNotes: Note[] = [];
      for (const template of planningNoteTemplates) {
        const consolidatedMessageList = this.getConsolidatedMessageList(
          context.messages
        );

        const planningNoteMessages = [
          consolidatedMessageList,
          toSystemMessage(template.name + "\r\n" + template.requestPrompt),
        ];

        const planningNoteContent = await context.grokClient.postChat(
          planningNoteMessages
        );

        allNotes.push({
          template: template,
          content: planningNoteContent,
        });
      }

      // Combine planning notes into a single context message
      const planningNotesContext = allNotes
        .map((note) => `Template: ${note.template.name}\n\n${note.content}`)
        .join("\n\n---\n\n");
      const planningNotesContextMessage = toSystemMessage(planningNotesContext);

      return {
        nextStep: "generating-response",
        data: {
          planningNotesContext: planningNotesContextMessage,
          allNotes,
        },
      };
    } catch (error) {
      console.error("Error generating planning notes:", error);
      return { nextStep: "idle" };
    }
  }

  private getConsolidatedMessageList(messageList: Message[]): Message {
    return toSystemMessage(
      messageList
        .map((message) => {
          return `${message.role}: ${message.content}`;
        })
        .join("\n")
    );
  }
}

export class GeneratingResponseState extends ChatFlowState {
  private planningNotesContext: Message;
  private allNotes: Note[];

  constructor(planningNotesContext: Message, allNotes: Note[]) {
    super();
    this.planningNotesContext = planningNotesContext;
    this.allNotes = allNotes;
  }

  async execute(context: ChatFlowContext): Promise<StateTransition> {
    try {
      const messagePrompt = toSystemMessage(
        "Without preamble, take into consideration the notes above and respond to the user's most recent message."
      );

      const messagesForFinalResponse = [
        ...context.messages,
        this.planningNotesContext,
        messagePrompt,
      ];

      const finalResponse = await context.grokClient.postChat(
        messagesForFinalResponse
      );

      // Add the final response to the history
      await context.addMessage(toSystemMessage(finalResponse));

      return {
        nextStep: "complete",
        data: { allNotes: this.allNotes },
      };
    } catch (error) {
      console.error("Error generating system response:", error);
      return { nextStep: "idle" };
    }
  }
}

export class CompleteState extends ChatFlowState {
  async execute(_: ChatFlowContext): Promise<StateTransition> {
    // Flow complete - transition back to idle after a brief moment
    setTimeout(() => {
      // This will be handled by the state machine
    }, 100);

    return { nextStep: "idle" };
  }
}
