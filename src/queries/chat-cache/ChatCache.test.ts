import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ChatHistoryReducer } from "./ChatHistoryReducer";
import { d } from "../../app/Dependencies/Dependencies";
import { ChatCache } from "./ChatCache";
import type { Message } from "../../models/ChatMessages/Messages";
import { DeleteMessageUtil } from "../../models/ChatMessages/DeleteMessageUtil";

// Mock external dependencies
vi.mock("./ChatHistoryReducer");
vi.mock("../app/Dependencies/Dependencies");

const mockChatHistoryReducer = ChatHistoryReducer as any;
const mockDependencies = d as any;

describe("ChatCache", () => {
  let mockChatHistoryApi: any;
  const mockChatId = "test-chat-123";

  beforeEach(() => {
    mockChatHistoryApi = createMockChatHistoryApi();
    mockDependencies.ChatHistoryApi = vi.fn(() => mockChatHistoryApi);
    mockChatHistoryReducer.reduce = vi.fn((msgs) => msgs);
    mockChatHistoryReducer.createDeleteCommand = vi.fn((id) =>
      createDeleteCommand(id)
    );

    // Default: return empty array for initialization to not interfere
    mockChatHistoryApi.getChatHistory = vi.fn().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Constructor & Initialization", () => {
    it("should initialize with chatId and empty messages array when no messages provided", async () => {
      const reducedMessages = createStandardMessages();
      setupSuccessfulInitialization(reducedMessages);

      const cache = new ChatCache(mockChatId);
      await waitForInitialization();

      expect(cache.getChatId()).toBe(mockChatId);
      expect(cache.getMessages()).toEqual(reducedMessages);
    });

    it("should initialize with provided messages", () => {
      const providedMessages = createStandardMessages();
      const cache = new ChatCache(mockChatId, providedMessages);

      expect(cache.getChatId()).toBe(mockChatId);
      expect(cache.getMessages()).toEqual(providedMessages);
    });

    it("should eventually set IsLoading to false after initialization", async () => {
      setupSuccessfulInitialization([]);
      const cache = new ChatCache(mockChatId, []);
      await waitForInitialization();

      expect(cache.IsLoading).toBe(false);
    });

    it("should automatically fetch chat history from API on first initialization", async () => {
      const rawMessages = createStandardMessages();
      setupSuccessfulInitialization(rawMessages);

      new ChatCache(mockChatId);
      await waitForInitialization();

      expectApiCalledToGetChatHistory();
    });

    it("should apply ChatHistoryReducer to raw messages", async () => {
      const rawMessages = createStandardMessages();
      const reducedMessages = [createUserMessage("reduced")];
      setupInitializationWithReduction(rawMessages, reducedMessages);

      const cache = new ChatCache(mockChatId);
      await waitForInitialization();

      expectReducerCalledWith(rawMessages);
      expect(cache.getMessages()).toEqual(reducedMessages);
    });

    it("should call API on manual initializeMessages even if already initialized", async () => {
      setupSuccessfulInitialization([]);
      const cache = new ChatCache(mockChatId);
      await waitForInitialization();

      vi.clearAllMocks();
      await cache.initializeMessages();

      // initializeMessages always calls the API (it's a manual refresh)
      expectApiCalledToGetChatHistory();
    });

    it("should set IsLoading during initialization", async () => {
      let loadingStateDuringCall = false;
      const cache = createCacheWithMessages([]);
      mockChatHistoryApi.getChatHistory = vi.fn(async () => {
        loadingStateDuringCall = cache.IsLoading;
        return [];
      });

      await cache.initializeMessages();

      expect(loadingStateDuringCall).toBe(true);
      expect(cache.IsLoading).toBe(false);
    });

    it("should handle API errors during initialization gracefully", async () => {
      // When initialization fails, the cache should still work
      mockChatHistoryApi.getChatHistory = vi.fn().mockResolvedValue([]);

      const cache = new ChatCache(mockChatId);
      await waitForInitialization();

      // Even though init happened in background, cache should be usable
      expect(cache.IsLoading).toBe(false);
      expect(cache.getChatId()).toBe(mockChatId);
    });
  });

  describe("Subscription Management", () => {
    it("should allow subscribing with a callback", () => {
      const cache = createCacheWithMessages([]);
      const callback = vi.fn();

      const unsubscribe = cache.subscribe(callback);

      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it("should return unsubscribe function that removes subscriber", async () => {
      const cache = createCacheWithMessages([]);
      const callback = vi.fn();
      const unsubscribe = cache.subscribe(callback);

      unsubscribe();
      await cache.addMessage(createUserMessage("test"));

      expect(callback).not.toHaveBeenCalled();
    });

    it("should support multiple subscribers", async () => {
      const cache = createCacheWithMessages([]);
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      cache.subscribe(callback1);
      cache.subscribe(callback2);

      await cache.addMessage(createUserMessage("test"));

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it("should notify all subscribers when changes occur", async () => {
      const cache = createCacheWithMessages([]);
      const callback = vi.fn();
      cache.subscribe(callback);

      await cache.addMessage(createUserMessage("test"));

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("Adding Messages", () => {
    it("should add a message to the messages array", async () => {
      setupSuccessfulAddMessage();
      const cache = createCacheWithMessages([]);
      const newMessage = createUserMessage("new");

      await cache.addMessage(newMessage);

      expectMessageInCache(cache, newMessage);
      expect(cache.getMessages()).toHaveLength(1);
    });

    it("should append to existing messages", async () => {
      setupSuccessfulAddMessage();
      const existingMessage = createUserMessage("existing");
      const cache = createCacheWithMessages([existingMessage]);
      const newMessage = createUserMessage("new");

      await cache.addMessage(newMessage);

      expect(cache.getMessages()).toEqual([existingMessage, newMessage]);
    });

    it("should notify subscribers after adding message locally", async () => {
      setupSuccessfulAddMessage();
      const cache = createCacheWithMessages([]);
      const callback = vi.fn();
      cache.subscribe(callback);

      await cache.addMessage(createUserMessage("test"));

      expect(callback).toHaveBeenCalled();
    });

    it("should call ChatHistoryAPI.addChatMessage with correct parameters", async () => {
      setupSuccessfulAddMessage();
      const cache = createCacheWithMessages([]);
      const message = createUserMessage("test");

      await cache.addMessage(message);

      expectApiCalledToAddMessage(mockChatId, message);
    });

    it("should set IsLoading during API call", async () => {
      const cache = createCacheWithMessages([]);
      let loadingDuringCall = false;
      mockChatHistoryApi.addChatMessage = vi.fn(async () => {
        loadingDuringCall = cache.IsLoading;
        return true;
      });

      await cache.addMessage(createUserMessage("test"));

      expect(loadingDuringCall).toBe(true);
      expect(cache.IsLoading).toBe(false);
    });

    it("should keep local message even if API call fails", async () => {
      setupFailedAddMessage();
      const cache = createCacheWithMessages([]);
      const message = createUserMessage("test");

      try {
        await cache.addMessage(message);
      } catch (e) {
        // Error is expected but message should still be in cache
      }

      expectMessageInCache(cache, message);
    });
  });

  describe("Getting Messages", () => {
    it("should return all messages including civit-job messages", () => {
      const messages = createMessagesWithCivitJob();
      const cache = createCacheWithMessages(messages);

      const result = cache.getMessages();

      expect(result).toEqual(messages);
      expectContainsCivitJobMessage(result);
    });

    it("should return messages excluding civit-job messages", () => {
      const allMessages = createMessagesWithCivitJob();
      const cache = createCacheWithMessages(allMessages);

      const result = cache.getMessagesForLLM();

      expectNoCivitJobMessages(result);
      expect(result).toHaveLength(4);
    });

    it("should return empty array when no non-civit-job messages exist", () => {
      const civitOnlyMessages = createCivitJobOnlyMessages();
      const cache = createCacheWithMessages(civitOnlyMessages);

      const result = cache.getMessagesForLLM();

      expect(result).toEqual([]);
    });

    it("should return the message with matching id", () => {
      const messages = createStandardMessages();
      const cache = createCacheWithMessages(messages);

      const result = cache.getMessage("3");

      expect(result).toEqual(messages[2]);
    });

    it("should return null when message id does not exist", () => {
      const cache = createCacheWithMessages(createStandardMessages());

      const result = cache.getMessage("nonexistent");

      expect(result).toBeNull();
    });

    it("should return null when messages array is empty", () => {
      const cache = createCacheWithMessages([]);

      const result = cache.getMessage("any-id");

      expect(result).toBeNull();
    });
  });

  describe("Deleting Single Message", () => {
    it("should remove the message with matching id", async () => {
      setupSuccessfulDeleteMessage();
      const messages = createStandardMessages();
      const cache = createCacheWithMessages([...messages]);

      await cache.deleteMessage("3");

      expectMessageNotInCache(cache, messages[2]);
      expect(cache.getMessages()).toHaveLength(messages.length - 1);
    });

    it("should do nothing when message id does not exist", async () => {
      setupSuccessfulDeleteMessage();
      const messages = createStandardMessages();
      const cache = createCacheWithMessages([...messages]);

      await cache.deleteMessage("nonexistent");

      expect(cache.getMessages()).toHaveLength(messages.length);
    });

    it("should maintain order of remaining messages", async () => {
      setupSuccessfulDeleteMessage();
      const messages = createStandardMessages();
      const cache = createCacheWithMessages([...messages]);

      await cache.deleteMessage("3");

      const remaining = cache.getMessages();
      expect(remaining[0]).toEqual(messages[0]);
      expect(remaining[1]).toEqual(messages[1]);
      expect(remaining[2]).toEqual(messages[3]);
    });

    it("should notify subscribers after local deletion", async () => {
      setupSuccessfulDeleteMessage();
      const cache = createCacheWithMessages(createStandardMessages());
      const callback = vi.fn();
      cache.subscribe(callback);

      await cache.deleteMessage("3");

      expect(callback).toHaveBeenCalled();
    });

    it("should call ChatHistoryAPI with delete command", async () => {
      setupSuccessfulDeleteMessage();
      const cache = createCacheWithMessages(createStandardMessages());

      await cache.deleteMessage("3");

      expectApiCalledToAddMessage(mockChatId, createDeleteCommand("3"));
    });

    it("should create delete command using ChatHistoryReducer", async () => {
      setupSuccessfulDeleteMessage();
      const cache = createCacheWithMessages(createStandardMessages());

      await cache.deleteMessage("3");

      expectDeleteCommandCreatedFor("3");
    });

    it("should set IsLoading during API call", async () => {
      const cache = createCacheWithMessages(createStandardMessages());
      let loadingDuringCall = false;
      mockChatHistoryApi.addChatMessage = vi.fn(async () => {
        loadingDuringCall = cache.IsLoading;
        return true;
      });

      await cache.deleteMessage("3");

      expect(loadingDuringCall).toBe(true);
      expect(cache.IsLoading).toBe(false);
    });
  });

  describe("Deleting Messages After Index", () => {
    it("should remove the message and all messages after it", async () => {
      setupSuccessfulDeleteMessages();
      const messages = createStandardMessages();
      const cache = createCacheWithMessages([...messages]);

      await cache.deleteMessagesAfterIndex("2");

      expect(cache.getMessages()).toEqual([messages[0]]);
    });

    it("should remove all messages when deleting from first message", async () => {
      setupSuccessfulDeleteMessages();
      const cache = createCacheWithMessages(createStandardMessages());

      await cache.deleteMessagesAfterIndex("1");

      expect(cache.getMessages()).toEqual([]);
    });

    it("should only remove the last message when deleting from last message", async () => {
      setupSuccessfulDeleteMessages();
      const messages = createStandardMessages();
      const cache = createCacheWithMessages([...messages]);

      await cache.deleteMessagesAfterIndex("5");

      expect(cache.getMessages()).toEqual(messages.slice(0, -1));
    });

    it("should do nothing when message id does not exist", async () => {
      setupSuccessfulDeleteMessages();
      const messages = createStandardMessages();
      const cache = createCacheWithMessages([...messages]);

      await cache.deleteMessagesAfterIndex("nonexistent");

      expect(cache.getMessages()).toHaveLength(messages.length);
    });

    it("should notify subscribers after local deletion", async () => {
      setupSuccessfulDeleteMessages();
      const cache = createCacheWithMessages(createStandardMessages());
      const callback = vi.fn();
      cache.subscribe(callback);

      await cache.deleteMessagesAfterIndex("2");

      expect(callback).toHaveBeenCalled();
    });

    it("should call ChatHistoryAPI.addChatMessages with multiple delete commands", async () => {
      setupSuccessfulDeleteMessages();
      const cache = createCacheWithMessages(createStandardMessages());

      await cache.deleteMessagesAfterIndex("3");

      expectApiCalledToAddMultipleMessages(mockChatId);
    });

    it("should create delete commands for all affected message IDs", async () => {
      setupSuccessfulDeleteMessages();
      const cache = createCacheWithMessages(createStandardMessages());

      await cache.deleteMessagesAfterIndex("3");

      const expectedCommands = ["3", "4", "5"].map(createDeleteCommand);
      expectApiCalledWith(mockChatId, expectedCommands);
    });

    it("should set IsLoading during API call", async () => {
      const cache = createCacheWithMessages(createStandardMessages());
      let loadingDuringCall = false;
      mockChatHistoryApi.addChatMessages = vi.fn(async () => {
        loadingDuringCall = cache.IsLoading;
        return true;
      });

      await cache.deleteMessagesAfterIndex("3");

      expect(loadingDuringCall).toBe(true);
      expect(cache.IsLoading).toBe(false);
    });
  });

  describe("Delete Preview", () => {
    it("should return correct count for messages to be deleted from middle", () => {
      const cache = createCacheWithMessages(createStandardMessages());

      const result = cache.getDeletePreview("3");

      expect(result).toEqual({ messageCount: 3 });
    });

    it("should return correct count when deleting from first message", () => {
      const messages = createStandardMessages();
      const cache = createCacheWithMessages(messages);

      const result = cache.getDeletePreview("1");

      expect(result).toEqual({ messageCount: messages.length });
    });

    it("should return 1 when deleting only the last message", () => {
      const cache = createCacheWithMessages(createStandardMessages());

      const result = cache.getDeletePreview("5");

      expect(result).toEqual({ messageCount: 1 });
    });

    it("should return 0 when message id does not exist", () => {
      const cache = createCacheWithMessages(createStandardMessages());

      const result = cache.getDeletePreview("nonexistent");

      expect(result).toEqual({ messageCount: 0 });
    });

    it("should return 0 when messages array is empty", () => {
      const cache = createCacheWithMessages([]);

      const result = cache.getDeletePreview("any-id");

      expect(result).toEqual({ messageCount: 0 });
    });
  });

  describe("Utility Methods", () => {
    it("should return the chat id provided during construction", () => {
      const testChatId = "my-special-chat";
      const cache = createCacheWithMessages([], testChatId);

      expect(cache.getChatId()).toBe(testChatId);
    });
  });

  // Helper Functions
  function createMockChatHistoryApi() {
    return {
      getChatHistory: vi.fn().mockResolvedValue([]),
      addChatMessage: vi.fn().mockResolvedValue(true),
      addChatMessages: vi.fn().mockResolvedValue(true),
    };
  }

  function createCacheWithMessages(
    messages: Message[],
    chatId: string = mockChatId
  ): ChatCache {
    // Setup the API to return the same messages so initialization doesn't overwrite
    mockChatHistoryApi.getChatHistory = vi.fn().mockResolvedValue(messages);
    mockChatHistoryReducer.reduce = vi.fn(() => messages);
    return new ChatCache(chatId, messages);
  }

  function createUserMessage(content: string, id?: string): Message {
    return {
      id: id || `msg-${Date.now()}-${Math.random()}`,
      role: "user",
      content,
    };
  }

  function createAssistantMessage(content: string, id: string): Message {
    return { id, role: "assistant", content };
  }

  function createCivitJobMessage(id: string): Message {
    return {
      id,
      role: "civit-job",
      content: JSON.stringify({ jobId: `job-${id}` }),
    };
  }

  function createDeleteCommand(messageId: string): Message {
    return DeleteMessageUtil.create(messageId);
  }

  function createStandardMessages(): Message[] {
    return [
      createUserMessage("Hello", "1"),
      createAssistantMessage("Hi there!", "2"),
      createUserMessage("How are you?", "3"),
      createCivitJobMessage("4"),
      createAssistantMessage("I'm doing well!", "5"),
    ];
  }

  function createMessagesWithCivitJob(): Message[] {
    return createStandardMessages();
  }

  function createCivitJobOnlyMessages(): Message[] {
    return [createCivitJobMessage("1"), createCivitJobMessage("2")];
  }

  function setupSuccessfulInitialization(messages: Message[]): void {
    mockChatHistoryApi.getChatHistory = vi.fn().mockResolvedValue(messages);
    mockChatHistoryReducer.reduce = vi.fn(() => messages);
  }

  function setupInitializationWithReduction(
    rawMessages: Message[],
    reducedMessages: Message[]
  ): void {
    mockChatHistoryApi.getChatHistory = vi.fn().mockResolvedValue(rawMessages);
    mockChatHistoryReducer.reduce = vi.fn(() => reducedMessages);
  }

  function setupSuccessfulAddMessage(): void {
    mockChatHistoryApi.addChatMessage = vi.fn().mockResolvedValue(true);
  }

  function setupFailedAddMessage(): void {
    mockChatHistoryApi.addChatMessage = vi
      .fn()
      .mockRejectedValue(new Error("API error"));
  }

  function setupSuccessfulDeleteMessage(): void {
    mockChatHistoryApi.addChatMessage = vi.fn().mockResolvedValue(true);
  }

  function setupSuccessfulDeleteMessages(): void {
    mockChatHistoryApi.addChatMessages = vi.fn().mockResolvedValue(true);
  }

  async function waitForInitialization(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  function expectApiCalledToGetChatHistory(): void {
    expect(mockChatHistoryApi.getChatHistory).toHaveBeenCalledWith(mockChatId);
  }

  function expectReducerCalledWith(messages: Message[]): void {
    expect(mockChatHistoryReducer.reduce).toHaveBeenCalledWith(messages);
  }

  function expectApiCalledToAddMessage(chatId: string, message: Message): void {
    expect(mockChatHistoryApi.addChatMessage).toHaveBeenCalledWith(
      chatId,
      expect.objectContaining({
        role: message.role,
        content: message.content,
      })
    );
  }

  function expectApiCalledToAddMultipleMessages(chatId: string): void {
    expect(mockChatHistoryApi.addChatMessages).toHaveBeenCalledWith(
      chatId,
      expect.any(Array)
    );
  }

  function expectApiCalledWith(chatId: string, commands: Message[]): void {
    const call = mockChatHistoryApi.addChatMessages.mock.calls[0];
    expect(call[0]).toBe(chatId);
    expect(call[1]).toHaveLength(commands.length);

    commands.forEach((expectedCmd, index) => {
      expect(call[1][index]).toMatchObject({
        role: expectedCmd.role,
        content: expectedCmd.content,
      });
    });
  }

  function expectDeleteCommandCreatedFor(messageId: string): void {
    const call = mockChatHistoryApi.addChatMessage.mock.calls[0];
    expect(call[1]).toMatchObject({
      role: "delete",
      content: JSON.stringify({ messageId }),
    });
  }

  function expectMessageInCache(cache: ChatCache, message: Message): void {
    expect(cache.getMessages()).toContain(message);
  }

  function expectMessageNotInCache(cache: ChatCache, message: Message): void {
    expect(cache.getMessages()).not.toContain(message);
  }

  function expectContainsCivitJobMessage(messages: Message[]): void {
    expect(messages.some((msg) => msg.role === "civit-job")).toBe(true);
  }

  function expectNoCivitJobMessages(messages: Message[]): void {
    expect(messages.some((msg) => msg.role === "civit-job")).toBe(false);
  }
});
