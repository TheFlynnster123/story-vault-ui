import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreateChat } from "./useCreateChat";
import { getChatIdsQueryKey } from "../ChatMenuList/useChats";

describe("useCreateChat", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should call createChat function", async () => {
    const { result } = renderHook(() => useCreateChat(), { wrapper });

    const mockCreateChatFn = vi.fn().mockResolvedValue(undefined);

    await result.current.createChat(mockCreateChatFn);

    expect(mockCreateChatFn).toHaveBeenCalledTimes(1);
  });

  it("should invalidate chat-ids cache on success", async () => {
    const { result } = renderHook(() => useCreateChat(), { wrapper });

    const refetchQueriesSpy = vi.spyOn(queryClient, "refetchQueries");
    const mockCreateChatFn = vi.fn().mockResolvedValue(undefined);

    await result.current.createChat(mockCreateChatFn);

    await waitFor(() => {
      expect(refetchQueriesSpy).toHaveBeenCalledWith({
        queryKey: getChatIdsQueryKey(),
      });
    });
  });

  it("should set isCreating to true while creating", async () => {
    const { result } = renderHook(() => useCreateChat(), { wrapper });

    expect(result.current.isCreating).toBe(false);

    const mockCreateChatFn = vi
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

    const createPromise = result.current.createChat(mockCreateChatFn);

    await waitFor(() => {
      expect(result.current.isCreating).toBe(true);
    });

    await createPromise;

    await waitFor(() => {
      expect(result.current.isCreating).toBe(false);
    });
  });

  it("should propagate errors from createChat function", async () => {
    const { result } = renderHook(() => useCreateChat(), { wrapper });

    const mockError = new Error("Failed to create chat");
    const mockCreateChatFn = vi.fn().mockRejectedValue(mockError);

    await expect(result.current.createChat(mockCreateChatFn)).rejects.toThrow(
      "Failed to create chat"
    );
  });

  it("should not invalidate cache if createChat function fails", async () => {
    const { result } = renderHook(() => useCreateChat(), { wrapper });

    const refetchQueriesSpy = vi.spyOn(queryClient, "refetchQueries");
    const mockCreateChatFn = vi
      .fn()
      .mockRejectedValue(new Error("Failed to create"));

    await expect(
      result.current.createChat(mockCreateChatFn)
    ).rejects.toThrow();

    expect(refetchQueriesSpy).not.toHaveBeenCalled();
  });
});
