import type { Message } from "../pages/Chat/ChatMessage";

export interface DeleteMessageCommand {
  type: "delete";
  messageId: string;
  timestamp: number;
}

export type ReducerCommand = DeleteMessageCommand;

export class ChatHistoryReducer {
  public static reduce(messages: Message[]): Message[] {
    const reducedMessages: Message[] = [];

    for (const message of messages) {
      if (isDeleteCommand(message)) {
        applyDeleteCommand(reducedMessages, message);
      } else {
        reducedMessages.push(message);
      }
    }

    return reducedMessages;
  }

  public static createDeleteCommand(messageId: string): Message {
    const command: DeleteMessageCommand = {
      type: "delete",
      messageId,
      timestamp: Date.now(),
    };

    return createCommandMessage(command);
  }
}

const isDeleteCommand = (message: Message): boolean => {
  return message.role === "delete";
};

const applyDeleteCommand = (
  messages: Message[],
  deleteMessage: Message
): void => {
  const command = parseDeleteCommand(deleteMessage);
  if (!command) return;

  const indexToDelete = findMessageIndex(messages, command.messageId);
  if (indexToDelete !== -1) {
    messages.splice(indexToDelete, 1);
  }
};

const parseDeleteCommand = (message: Message): DeleteMessageCommand | null => {
  try {
    const command = JSON.parse(message.content) as DeleteMessageCommand;
    return isValidDeleteCommand(command) ? command : null;
  } catch {
    return null;
  }
};

const isValidDeleteCommand = (
  command: any
): command is DeleteMessageCommand => {
  return (
    command?.type === "delete" &&
    typeof command?.messageId === "string" &&
    typeof command?.timestamp === "number"
  );
};

const findMessageIndex = (messages: Message[], messageId: string): number => {
  return messages.findIndex((message) => message.id === messageId);
};

const createCommandMessage = (command: DeleteMessageCommand): Message => {
  return {
    id: generateCommandId(),
    role: "delete",
    content: JSON.stringify(command),
  };
};

const generateCommandId = (): string => {
  return `delete-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};
