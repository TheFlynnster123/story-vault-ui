import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreateChat } from "../ChatCreationWizard/useCreateChat";
import { getChatIdsQueryKey } from "../ChatMenuList/useChats";
import { d } from "../../services/Dependencies";
import type { ChatSettings } from "../../services/Chat/ChatSettings";

vi.mock("../../services/Dependencies");

describe("useCreateChat", () => {
  let queryClient: QueryClient;
  let mockChatSettingsService: any;
  let mockChatService: any;
  let mockRecentChatsService: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockChatSettingsService = {
      save: vi.fn().mockResolvedValue(undefined),
    };

    mockChatService = {
      InitializeStory: vi.fn().mockResolvedValue(undefined),
    };

    mockRecentChatsService = {
      recordNavigation: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(d.ChatSettingsService).mockReturnValue(mockChatSettingsService);
    vi.mocked(d.ChatService).mockReturnValue(mockChatService);
    vi.mocked(d.RecentChatsService).mockReturnValue(mockRecentChatsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const createMockParams = () => ({
    chatId: "test-chat-123",
    settings: {
      timestampCreatedUtcMs: Date.now(),
      chatTitle: "Test Chat",
      prompt: "Test prompt",
    } as ChatSettings,
    story: "Once upon a time...",
  });

  it("should save chat settings", async () => {
    const { result } = renderHook(() => useCreateChat(), { wrapper });
    const params = createMockParams();

    await result.current.createChat(params);

    expect(d.ChatSettingsService).toHaveBeenCalledWith(params.chatId);
    expect(mockChatSettingsService.save).toHaveBeenCalledWith(params.settings);
  });

  it("should initialize story", async () => {
    const { result } = renderHook(() => useCreateChat(), { wrapper });
    const params = createMockParams();

    await result.current.createChat(params);

    expect(d.ChatService).toHaveBeenCalledWith(params.chatId);
    expect(mockChatService.InitializeStory).toHaveBeenCalledWith(params.story);
  });

  it("should record navigation", async () => {
    const { result } = renderHook(() => useCreateChat(), { wrapper });
    const params = createMockParams();

    await result.current.createChat(params);

    expect(d.RecentChatsService).toHaveBeenCalled();
    expect(mockRecentChatsService.recordNavigation).toHaveBeenCalledWith(
      params.chatId
    );
  });

  it("should invalidate chat-ids cache on success", async () => {
    const { result } = renderHook(() => useCreateChat(), { wrapper });
    const refetchQueriesSpy = vi.spyOn(queryClient, "refetchQueries");
    const params = createMockParams();

    await result.current.createChat(params);

    await waitFor(() => {
      expect(refetchQueriesSpy).toHaveBeenCalledWith({
        queryKey: getChatIdsQueryKey(),
      });
    });
  });

  it("should set isCreating to true while creating", async () => {
    const { result } = renderHook(() => useCreateChat(), { wrapper });
    const params = createMockParams();

    expect(result.current.isCreating).toBe(false);

    mockChatSettingsService.save.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const createPromise = result.current.createChat(params);

    await waitFor(() => {
      expect(result.current.isCreating).toBe(true);
    });

    await createPromise;

    await waitFor(() => {
      expect(result.current.isCreating).toBe(false);
    });
  });

  it("should propagate errors from save", async () => {
    const { result } = renderHook(() => useCreateChat(), { wrapper });
    const params = createMockParams();

    mockChatSettingsService.save.mockRejectedValue(new Error("Failed to save"));

    await expect(result.current.createChat(params)).rejects.toThrow(
      "Failed to save"
    );
  });

  it("should propagate errors from InitializeStory", async () => {
    const { result } = renderHook(() => useCreateChat(), { wrapper });
    const params = createMockParams();

    mockChatService.InitializeStory.mockRejectedValue(
      new Error("Failed to initialize")
    );

    await expect(result.current.createChat(params)).rejects.toThrow(
      "Failed to initialize"
    );
  });

  it("should not invalidate cache if createChat fails", async () => {
    const { result } = renderHook(() => useCreateChat(), { wrapper });
    const refetchQueriesSpy = vi.spyOn(queryClient, "refetchQueries");
    const params = createMockParams();

    mockChatSettingsService.save.mockRejectedValue(
      new Error("Failed to create")
    );

    await expect(result.current.createChat(params)).rejects.toThrow();

    expect(refetchQueriesSpy).not.toHaveBeenCalled();
  });
});
