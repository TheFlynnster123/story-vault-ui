import { afterEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "../../../../../../testing";
import { d } from "../../../../../../services/Dependencies";
import { ViewCompressionButton } from "./ViewCompressionButton";

describe("ViewCompressionButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the full original and lets the user edit the compression", async () => {
    const editMessageCompression = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(d, "UserChatProjection").mockReturnValue({
      GetMessage: vi.fn().mockReturnValue({
        id: "message-1",
        type: "assistant",
        content: "Complete original message.",
        compression: {
          content: "Generated compression.",
          sourceContentFingerprint: "fingerprint",
          userEdited: false,
        },
        hiddenByChapterId: undefined,
        deleted: false,
        hidden: false,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.spyOn(d, "ChatService").mockReturnValue({
      EditMessageCompression: editMessageCompression,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const user = userEvent.setup();

    render(
      <ViewCompressionButton chatId="chat-1" messageId="message-1" />,
    );
    await user.click(
      screen.getByRole("button", { name: "View compression" }),
    );

    expect(await screen.findByLabelText("Original message")).toHaveValue(
      "Complete original message.",
    );
    const compression = screen.getByLabelText("Model-facing compression");
    expect(compression).toHaveValue("Generated compression.");

    await user.clear(compression);
    await user.type(compression, "Corrected compression.");
    await user.click(
      screen.getByRole("button", { name: "Save compression" }),
    );

    expect(editMessageCompression).toHaveBeenCalledWith(
      "message-1",
      "Corrected compression.",
    );
  });
});
