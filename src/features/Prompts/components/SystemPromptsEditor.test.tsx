import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, userEvent, waitFor } from "../../../testing";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { SystemPromptsEditor } from "./SystemPromptsEditor";
import { d } from "../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../services/SystemPrompts";
import type { SystemPrompts } from "../services/SystemPrompts";

vi.mock("@mantine/notifications", () => ({
  notifications: {
    show: vi.fn(),
  },
}));

vi.mock("react-virtuoso", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  GroupedVirtuoso: ({ groupCounts, groupContent, itemContent }: any) => {
    const nodes: React.ReactNode[] = [];
    let itemIndex = 0;
    groupCounts.forEach((count: number, groupIndex: number) => {
      nodes.push(<div key={`g-${groupIndex}`}>{groupContent(groupIndex)}</div>);
      for (let i = 0; i < count; i++) {
        nodes.push(<div key={`i-${itemIndex}`}>{itemContent(itemIndex)}</div>);
        itemIndex++;
      }
    });
    return <div>{nodes}</div>;
  },
}));

const createMockModelsResponse = (
  models: Array<{ id: string; name: string }>,
) => ({
  data: models,
});

describe("SystemPromptsEditor", () => {
  let queryClient: QueryClient;
  let savedPrompts: SystemPrompts;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    savedPrompts = { ...DEFAULT_SYSTEM_PROMPTS };

    vi.spyOn(d, "SystemPromptsManagedBlob").mockReturnValue({
      get: vi.fn().mockResolvedValue(savedPrompts),
      save: vi.fn().mockImplementation(async (prompts: SystemPrompts) => {
        savedPrompts = prompts;
      }),
      saveDebounced: vi.fn().mockImplementation((prompts: SystemPrompts) => {
        savedPrompts = prompts;
      }),
      savePendingChanges: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    vi.spyOn(d, "RecentModelsService").mockReturnValue({
      getRecentModels: vi.fn().mockReturnValue([]),
      trackModel: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(
          createMockModelsResponse([
            { id: "openai/gpt-4", name: "GPT-4" },
            { id: "anthropic/claude-3", name: "Claude 3" },
          ]),
        ),
        { status: 200 },
      ),
    );
  });

  afterEach(() => {
    vi.mocked(global.fetch).mockReset();
    queryClient.clear();
  });

  const renderEditor = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <SystemPromptsEditor />
      </QueryClientProvider>,
    );

  it("persists a newly selected model instead of reverting it", async () => {
    renderEditor();

    await waitFor(() => {
      expect(
        screen.getByLabelText("Story Generation Model"),
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Story Generation Model"));

    await waitFor(() => {
      expect(screen.getByText("Select Model")).toBeInTheDocument();
    });

    await user.click(screen.getByText("GPT-4"));

    await waitFor(() => {
      expect(savedPrompts.newStoryModel).toBe("openai/gpt-4");
    });

    // The model should remain selected in the UI, not revert to "Default".
    await waitFor(() => {
      expect(screen.getByText("GPT-4")).toBeInTheDocument();
    });
  });
});
