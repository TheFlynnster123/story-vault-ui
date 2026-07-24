import { describe, expect, it } from "vitest";
import type { LLMMessage } from "../../../../services/CQRS/LLMChatProjection";
import {
  createContextDocument,
  renderConsolidatedReasoningContext,
  renderContextDocumentMessages,
  traceContextDocument,
} from "./ContextDocument";

describe("ContextDocument", () => {
  it("places durable sections before the configured recent history", () => {
    const history = createHistory(4);
    const document = createContextDocument({
      projectedHistory: history,
      memoryMessages: [systemMessage("# Memories\r\nRemember this")],
      characterSheetMessages: [
        systemMessage("# Character Sheets\r\n## Mara\n- Navigator"),
      ],
      recentMessageCount: 2,
    });

    expect(renderContextDocumentMessages(document).map(getContent)).toEqual([
      "Message 1",
      "Message 2",
      "# Memories\r\nRemember this",
      "# Character Sheets\r\n## Mara\n- Navigator",
      "Message 3",
      "Message 4",
    ]);
  });

  it("does not mutate source arrays", () => {
    const history = createHistory(2);
    const memories = [systemMessage("# Memories\r\nFact")];
    const characters = [systemMessage("# Character Sheets\r\nSheet")];

    const document = createContextDocument({
      projectedHistory: history,
      memoryMessages: memories,
      characterSheetMessages: characters,
      recentMessageCount: 1,
    });
    document.earlierHistory.push(systemMessage("Changed"));
    document.memories.push(systemMessage("Changed"));
    document.characterSheets.push(systemMessage("Changed"));

    expect(history).toHaveLength(2);
    expect(memories).toHaveLength(1);
    expect(characters).toHaveLength(1);
  });

  it("keeps all projected history recent when the configured count is larger", () => {
    const document = createContextDocument({
      projectedHistory: createHistory(2),
      memoryMessages: [],
      characterSheetMessages: [],
      recentMessageCount: 20,
    });

    expect(document.earlierHistory).toEqual([]);
    expect(document.recentHistory.map(getContent)).toEqual([
      "Message 1",
      "Message 2",
    ]);
  });

  it("renders consolidated reasoning with parity to the prior section format", () => {
    const document = createContextDocument({
      projectedHistory: [
        userMessage("Earlier", "message-1"),
        assistantMessage("Recent", "message-2"),
      ],
      memoryMessages: [systemMessage("# Memories\r\nRemember this")],
      characterSheetMessages: [
        systemMessage("# Character Sheets\r\n## Mara\n- Navigator"),
      ],
      recentMessageCount: 1,
    });

    expect(
      renderConsolidatedReasoningContext(document, "Think carefully"),
    ).toBe(
      [
        "Chat History:\n\nUser: Earlier",
        "Memories:\n\nRemember this",
        "Character Sheets:\n\n## Mara\n- Navigator",
        "Recent Chat History:\n\nAssistant: Recent",
        "Reasoning Instructions:\n\nThink carefully",
      ].join("\n\n---\n\n"),
    );
  });

  it("traces every context section and included projected message ID", () => {
    const document = createContextDocument({
      projectedHistory: [
        userMessage("Earlier", "message-1"),
        assistantMessage("Recent", "message-2"),
      ],
      memoryMessages: [systemMessage("# Memories\r\nFact")],
      characterSheetMessages: [],
      recentMessageCount: 1,
    });

    expect(traceContextDocument(document)).toEqual([
      {
        source: "earlier-history",
        messageCount: 1,
        messageIds: ["message-1"],
      },
      { source: "memories", messageCount: 1, messageIds: [] },
      { source: "character-sheets", messageCount: 0, messageIds: [] },
      {
        source: "recent-history",
        messageCount: 1,
        messageIds: ["message-2"],
      },
    ]);
  });
});

const createHistory = (count: number): LLMMessage[] =>
  Array.from({ length: count }, (_, index) =>
    userMessage(`Message ${index + 1}`, `message-${index + 1}`),
  );

const userMessage = (content: string, id?: string): LLMMessage => ({
  id,
  type: "message",
  role: "user",
  content,
});

const assistantMessage = (content: string, id?: string): LLMMessage => ({
  id,
  type: "message",
  role: "assistant",
  content,
});

const systemMessage = (content: string): LLMMessage => ({
  role: "system",
  content,
});

const getContent = (message: LLMMessage): string => message.content;
