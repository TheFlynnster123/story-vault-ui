import { DeleteMessageUtil } from "../../models/ChatMessages/DeleteMessageUtil";
import { EditMessageUtil } from "../../models/ChatMessages/EditMessageUtil";
import { type Message } from "../../models/ChatMessages/Messages";

export class ChatHistoryReducer {
  public static reduce(messages: Message[]): Message[] {
    const startTime = Date.now();

    const reducedMessages: Message[] = [];

    for (const message of messages) {
      if (message.role === "delete") {
        applyDeleteCommand(reducedMessages, message);
      } else if (message.role === "edit") {
        applyEditCommand(reducedMessages, message);
      } else {
        reducedMessages.push(message);
      }
    }

    const endTime = Date.now();
    console.log(
      `ChatHistoryReducer.reduce processed ${messages.length} messages in ${
        endTime - startTime
      } ms`
    );
    return reducedMessages;
  }
}

const applyDeleteCommand = (
  messages: Message[],
  deleteMessage: Message
): void => {
  const content = DeleteMessageUtil.parse(deleteMessage);
  if (!content) return;

  const indexToDelete = findMessageIndex(messages, content.messageId);
  if (indexToDelete !== -1) messages.splice(indexToDelete, 1);
};

const applyEditCommand = (messages: Message[], editMessage: Message): void => {
  const content = EditMessageUtil.parse(editMessage);
  if (!content) return;

  const indexToEdit = findMessageIndex(messages, content.messageId);
  if (indexToEdit !== -1) {
    messages[indexToEdit].content = content.newContent;
  }
};

const findMessageIndex = (messages: Message[], messageId: string): number => {
  return messages.findIndex((message) => message.id === messageId);
};
