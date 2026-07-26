import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "../../../testing";
import type { TrackedRequest } from "../services/RequestTracker";
import { RequestInspection } from "./RequestInspection";

describe("RequestInspection", () => {
  it("shows context assembly counts and details when a trace is available", async () => {
    const user = userEvent.setup();
    render(
      <RequestInspection
        request={createRequest({
          projection: [
            {
              id: "message-1",
              type: "message",
              included: true,
              buffered: true,
            },
            {
              id: "note-1",
              type: "note",
              included: false,
              buffered: false,
              exclusionReason: "expired-note",
            },
          ],
          sections: [
            {
              source: "recent-history",
              messageCount: 1,
              messageIds: ["message-1"],
            },
          ],
          appendedSources: ["response-prompt"],
        })}
      />,
    );

    const control = screen.getByRole("button", {
      name: "Context assembly (1 projected · 1 excluded)",
    });
    expect(control).toBeInTheDocument();

    await user.click(control);

    expect(screen.getByText("recent-history: 1")).toBeInTheDocument();
    expect(
      screen.getByText("Appended after context: response-prompt"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Restored by trailing-chapter buffer: 1"),
    ).toBeInTheDocument();
    expect(screen.getByText(/expired-note/)).toBeInTheDocument();
  });

  it("omits context assembly for legacy tracked requests", () => {
    render(<RequestInspection request={createRequest()} />);

    expect(
      screen.queryByRole("button", { name: /Context assembly/ }),
    ).not.toBeInTheDocument();
  });
});

const createRequest = (
  contextTrace?: TrackedRequest["contextTrace"],
): TrackedRequest => ({
  id: "request-1",
  label: "Chat",
  type: "chat",
  status: "success",
  model: "test/model",
  timestamp: new Date("2026-07-26T12:00:00Z"),
  inputMessageCount: 1,
  inputCharCount: 5,
  responseCharCount: 4,
  inputMessages: [{ role: "user", content: "Hello" }],
  ...(contextTrace ? { contextTrace } : {}),
  responseContent: "Done",
});
