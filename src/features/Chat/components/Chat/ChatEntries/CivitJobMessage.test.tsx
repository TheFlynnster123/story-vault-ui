import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, userEvent } from "../../../../../testing";
import type { CivitWorkflowChatMessage } from "../../../../../services/CQRS/UserChatProjection";
import { useCivitJob } from "../../../../Images/hooks/useCivitJob";
import { CivitJobMessage } from "./CivitJobMessage";
import {
  formatExpectedCompletion,
  formatQueuePosition,
} from "./CivitJobSchedulingFormatters";

vi.mock("../../../../Images/hooks/useCivitJob");

const createMessage = (
  data: Partial<CivitWorkflowChatMessage["data"]> = {},
): CivitWorkflowChatMessage => ({
  id: "image-1",
  type: "civit-workflow",
  data: {
    workflowId: "workflow-1",
    prompt: "A test image",
    ...data,
  },
  hiddenByChapterId: undefined,
  deleted: false,
  hidden: false,
});

describe("CivitJobMessage scheduling details", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows priority, place in line, and expected completion while waiting", () => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-10T23:55:18.277Z");
    vi.mocked(useCivitJob).mockReturnValue({
      photoBase64: undefined,
      isLoading: false,
      jobStatus: {
        isLoading: true,
        scheduling: {
          priority: "low",
          precedingJobs: 4,
          expectedCompleteAt: "2026-08-10T23:58:38.277Z",
        },
      },
    } as ReturnType<typeof useCivitJob>);

    render(
      <CivitJobMessage
        chatId="chat-1"
        message={createMessage()}
        isLastMessage
      />,
    );

    expect(screen.getByText("Low priority")).toBeVisible();
    expect(screen.getByText("4th in line")).toBeVisible();
    expect(screen.getByText("Expected in 3min, 20s")).toBeVisible();

    act(() => vi.advanceTimersByTime(1000));

    expect(screen.getByText("Expected in 3min, 19s")).toBeVisible();
  });
});

describe("CivitJobMessage failure details", () => {
  it("shows a failed placeholder without a spinner or inline error", () => {
    vi.mocked(useCivitJob).mockReturnValue({
      photoBase64: undefined,
      isLoading: false,
      jobStatus: undefined,
    } as ReturnType<typeof useCivitJob>);

    render(
      <CivitJobMessage
        chatId="chat-1"
        message={createMessage({
          generationStatus: "failed",
          generationError: "The provider rejected the prompt.",
        })}
        isLastMessage
      />,
    );

    expect(screen.getByText("Failed")).toBeVisible();
    expect(
      screen.getByRole("img", { name: "No image generated" }),
    ).toBeVisible();
    expect(screen.queryByLabelText("Generating image")).not.toBeInTheDocument();
    expect(
      screen.queryByText("The provider rejected the prompt."),
    ).not.toBeInTheDocument();
  });

  it("reveals the generation error from the message overlay", async () => {
    const user = userEvent.setup();
    vi.mocked(useCivitJob).mockReturnValue({
      photoBase64: undefined,
      isLoading: false,
      jobStatus: undefined,
    } as ReturnType<typeof useCivitJob>);

    render(
      <CivitJobMessage
        chatId="chat-1"
        message={createMessage({
          generationStatus: "failed",
          generationError: "The provider rejected the prompt.",
        })}
        isLastMessage
      />,
    );

    await user.click(screen.getByText("Failed"));
    await user.click(screen.getByRole("button", { name: "View Error" }));

    expect(
      await screen.findByRole("dialog", { name: "Image Generation Error" }),
    ).toBeVisible();
    expect(
      await screen.findByText("The provider rejected the prompt."),
    ).toBeVisible();
  });

  it("uses workflow polling errors for the failed state", async () => {
    const user = userEvent.setup();
    vi.mocked(useCivitJob).mockReturnValue({
      photoBase64: undefined,
      isLoading: false,
      jobStatus: {
        isLoading: false,
        error: "Image generation timed out.",
      },
    } as ReturnType<typeof useCivitJob>);

    render(
      <CivitJobMessage
        chatId="chat-1"
        message={createMessage()}
        isLastMessage
      />,
    );

    await user.click(screen.getByText("Failed"));
    await user.click(screen.getByRole("button", { name: "View Error" }));

    expect(
      await screen.findByRole("dialog", { name: "Image Generation Error" }),
    ).toBeVisible();
    expect(await screen.findByText("Image generation timed out.")).toBeVisible();
  });
});

describe("formatQueuePosition", () => {
  it.each([
    [0, "Next in line"],
    [1, "1st in line"],
    [2, "2nd in line"],
    [3, "3rd in line"],
    [4, "4th in line"],
    [11, "11th in line"],
    [12, "12th in line"],
    [13, "13th in line"],
    [21, "21st in line"],
  ])("formats %i as %s", (position, expected) => {
    expect(formatQueuePosition(position)).toBe(expected);
  });
});

describe("formatExpectedCompletion", () => {
  it("formats a future completion time as a compact duration", () => {
    expect(
      formatExpectedCompletion(
        "2026-08-10T23:58:38.277Z",
        Date.parse("2026-08-10T23:55:18.277Z"),
      ),
    ).toBe("Expected in 3min, 20s");
  });

  it("handles estimates that have passed", () => {
    expect(
      formatExpectedCompletion(
        "2026-08-10T23:55:18.277Z",
        Date.parse("2026-08-10T23:55:19.277Z"),
      ),
    ).toBe("Expected any moment");
  });
});
