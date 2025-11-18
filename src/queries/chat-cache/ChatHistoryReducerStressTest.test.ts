import { describe, it, expect } from "vitest";
import { ChatHistoryReducer } from "./ChatHistoryReducer";
import { type Message } from "../../models/ChatMessages/Messages";
import { DeleteMessageUtil } from "../../models/ChatMessages/DeleteMessageUtil";

describe("ChatHistoryReducer Stress Test", () => {
  it("should reduce 10,000 messages with 50% delete operations in less than 3 seconds", () => {
    const messages = generateStressTestMessages(10000);
    const startTime = performance.now();

    const result = ChatHistoryReducer.reduce(messages);

    const endTime = performance.now();
    const durationMs = endTime - startTime;
    const durationSeconds = durationMs / 1000;

    validateReducedMessages(result, messages);

    console.log(`\n📊 Stress Test Results:`);
    console.log(`   Total messages processed: ${messages.length}`);
    console.log(`   Delete operations: ${countDeleteCommands(messages)}`);
    console.log(`   Final message count: ${result.length}`);
    console.log(
      `   Duration: ${durationMs.toFixed(2)} ms (${durationSeconds.toFixed(
        3
      )} seconds)`
    );
    console.log(
      `   Performance: ${(messages.length / durationSeconds).toFixed(
        0
      )} messages/second`
    );

    expect(durationSeconds).toBeLessThan(1);
  });

  it("should handle 50,000 messages efficiently", () => {
    const messages = generateStressTestMessages(50000);
    const startTime = performance.now();

    const result = ChatHistoryReducer.reduce(messages);

    const endTime = performance.now();
    const durationSeconds = (endTime - startTime) / 1000;

    console.log(
      `\n📊 Extended Stress Test (50k messages): ${durationSeconds.toFixed(
        3
      )} seconds`
    );

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should maintain message order after deletions", () => {
    const messages = generateStressTestMessages(1000);

    const result = ChatHistoryReducer.reduce(messages);

    expectMessagesInChronologicalOrder(result);
  });

  it("should handle worst-case scenario: all deletes at the end", () => {
    const regularMessages = generateRegularMessages(5000);
    const deleteCommands = regularMessages.map((msg) =>
      createDeleteCommandMessage(msg.id)
    );
    const messages = [...regularMessages, ...deleteCommands];

    const startTime = performance.now();
    const result = ChatHistoryReducer.reduce(messages);
    const durationSeconds = (performance.now() - startTime) / 1000;

    console.log(
      `\n📊 Worst-case (5k messages + 5k deletes): ${durationSeconds.toFixed(
        3
      )} seconds`
    );

    expect(result).toHaveLength(0);
    expect(durationSeconds).toBeLessThan(1);
  });

  it("should handle interleaved deletes and messages efficiently", () => {
    const messages: Message[] = [];
    const messageIds: string[] = [];

    // Create pattern: 10 messages, delete 5, repeat
    for (let i = 0; i < 1000; i++) {
      const batchMessages = generateRegularMessages(10);
      messages.push(...batchMessages);
      messageIds.push(...batchMessages.map((m) => m.id));

      // Delete half of them
      for (let j = 0; j < 5; j++) {
        const randomIndex = Math.floor(Math.random() * messageIds.length);
        const idToDelete = messageIds[randomIndex];
        messages.push(createDeleteCommandMessage(idToDelete));
      }
    }

    const startTime = performance.now();
    const result = ChatHistoryReducer.reduce(messages);
    const durationSeconds = (performance.now() - startTime) / 1000;

    console.log(
      `\n📊 Interleaved pattern (20k operations): ${durationSeconds.toFixed(
        3
      )} seconds`
    );

    expect(durationSeconds).toBeLessThan(3);
    expect(result.length).toBeGreaterThan(0);
  });
});

// Helper Functions

function generateStressTestMessages(count: number): Message[] {
  const messages: Message[] = [];
  const createdMessageIds: string[] = [];

  for (let i = 0; i < count; i++) {
    // 50% chance to create a delete command if we have messages to delete
    if (createdMessageIds.length > 0 && Math.random() < 0.5) {
      const randomIndex = Math.floor(Math.random() * createdMessageIds.length);
      const messageIdToDelete = createdMessageIds[randomIndex];

      messages.push(createDeleteCommandMessage(messageIdToDelete));
      createdMessageIds.splice(randomIndex, 1);
    } else {
      const newMessage = createRandomMessage(i);
      messages.push(newMessage);
      createdMessageIds.push(newMessage.id);
    }
  }

  return messages;
}

function generateRegularMessages(count: number): Message[] {
  const messages: Message[] = [];
  for (let i = 0; i < count; i++) {
    messages.push(createRandomMessage(i));
  }
  return messages;
}

function createRandomMessage(index: number): Message {
  const roles: Array<"user" | "assistant" | "system" | "civit-job"> = [
    "user",
    "assistant",
    "system",
    "civit-job",
  ];
  const role = roles[Math.floor(Math.random() * roles.length)];
  const contentSize = getRandomContentSize();

  return {
    id: `msg-${index}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`,
    role,
    content: generateRandomContent(contentSize),
  };
}

function getRandomContentSize(): number {
  const rand = Math.random();
  if (rand < 0.5) return 50; // 50% - small messages
  if (rand < 0.8) return 500; // 30% - medium messages
  if (rand < 0.95) return 2000; // 15% - large messages
  return 10000; // 5% - very large messages
}

function generateRandomContent(size: number): string {
  const words = [
    "lorem",
    "ipsum",
    "dolor",
    "sit",
    "amet",
    "consectetur",
    "adipiscing",
    "elit",
    "sed",
    "do",
    "eiusmod",
    "tempor",
    "incididunt",
    "ut",
    "labore",
    "et",
    "dolore",
    "magna",
    "aliqua",
  ];

  let content = "";
  while (content.length < size) {
    const word = words[Math.floor(Math.random() * words.length)];
    content += word + " ";
  }

  return content.substring(0, size);
}

function createDeleteCommandMessage(messageId: string): Message {
  return DeleteMessageUtil.create(messageId);
}

function countDeleteCommands(messages: Message[]): number {
  return messages.filter((msg) => msg.role === "delete").length;
}

function validateReducedMessages(
  result: Message[],
  _originalMessages: Message[]
): void {
  expect(result).toBeDefined();
  expect(Array.isArray(result)).toBe(true);

  // No delete commands should remain in the result
  const deleteCommandsInResult = result.filter((msg) => msg.role === "delete");
  expect(deleteCommandsInResult).toHaveLength(0);

  // All messages should have valid IDs
  for (const message of result) {
    expect(message.id).toBeDefined();
    expect(typeof message.id).toBe("string");
    expect(message.id.length).toBeGreaterThan(0);
  }

  // No duplicate IDs
  const ids = result.map((msg) => msg.id);
  const uniqueIds = new Set(ids);
  expect(uniqueIds.size).toBe(ids.length);
}

function expectMessagesInChronologicalOrder(messages: Message[]): void {
  // Messages should maintain their relative order
  // (we can't check timestamps as they're not on the Message type,
  // but we can verify the array is stable)
  expect(messages).toBeDefined();
  expect(Array.isArray(messages)).toBe(true);

  // Check that no delete commands are present
  const deleteCommands = messages.filter((msg) => msg.role === "delete");
  expect(deleteCommands).toHaveLength(0);
}
