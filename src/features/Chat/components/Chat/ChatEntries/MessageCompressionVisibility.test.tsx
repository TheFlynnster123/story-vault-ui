import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "../../../../../testing";
import type { UserChatMessage } from "../../../../../services/CQRS/UserChatProjection";
import { UserMessage } from "./UserMessage";

vi.mock("./ChatEntryButtons/MessageOverlay", () => ({
  MessageOverlay: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("./ChatEntryButtons/MessageButtonsContainer", () => ({
  MessageButtonsContainer: ({
    hasCompression,
  }: {
    hasCompression?: boolean;
  }) => (
    <div data-testid="message-buttons">
      {hasCompression ? "compression-visible" : "compression-hidden"}
    </div>
  ),
}));

const message: UserChatMessage = {
  id: "message-1",
  type: "user-message",
  content: "Complete original message.",
  compression: {
    content: "Saved compression.",
    sourceContentFingerprint: "fingerprint",
    userEdited: false,
  },
  hiddenByChapterId: undefined,
  deleted: false,
  hidden: false,
};

describe("message compression visibility", () => {
  it("hides a saved compression while global compression is disabled", () => {
    render(
      <UserMessage
        chatId="chat-1"
        message={message}
        isLastMessage
        messageCompressionEnabled={false}
      />,
    );

    expect(screen.getByTestId("message-buttons")).toHaveTextContent(
      "compression-hidden",
    );
  });

  it("reveals the saved compression after global compression is enabled", () => {
    render(
      <UserMessage
        chatId="chat-1"
        message={message}
        isLastMessage
        messageCompressionEnabled
      />,
    );

    expect(screen.getByTestId("message-buttons")).toHaveTextContent(
      "compression-visible",
    );
  });
});
