import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ChatMessage,
  type MessageItemProps,
  type Message,
} from "../../Chat/ChatMessage";

describe("ChatMessage", () => {
  const mockMessage: Message = {
    id: "test-message-1",
    role: "user",
    content: "This is a test message",
  };

  const defaultProps: MessageItemProps = {
    message: mockMessage,
  };

  describe("rendering", () => {
    it("should render user message with correct styling", () => {
      render(<ChatMessage {...defaultProps} />);

      const messageElement = screen.getByText("This is a test message");
      expect(messageElement).toBeInTheDocument();
      expect(messageElement).toHaveClass("message-text", "user");
    });

    it("should render system message with correct styling", () => {
      const systemMessage: Message = {
        id: "system-1",
        role: "system",
        content: "System response",
      };

      render(<ChatMessage message={systemMessage} />);

      const messageElement = screen.getByText("System response");
      expect(messageElement).toHaveClass("message-text", "system");
    });

    it("should render assistant message with correct styling", () => {
      const assistantMessage: Message = {
        id: "assistant-1",
        role: "assistant",
        content: "Assistant response",
      };

      render(<ChatMessage message={assistantMessage} />);

      const messageElement = screen.getByText("Assistant response");
      expect(messageElement).toHaveClass("message-text", "assistant");
    });
  });

  describe("message formatting", () => {
    it("should format quoted text with special styling", () => {
      const messageWithQuotes: Message = {
        id: "quoted-1",
        role: "user",
        content: 'This has "quoted text" in it',
      };

      render(<ChatMessage message={messageWithQuotes} />);

      const messageElement = screen.getByText(/This has/).parentElement;
      expect(messageElement?.innerHTML).toContain(
        '<span class="quoted-text">"quoted text"</span>'
      );
    });

    it("should format emphasized text with asterisks", () => {
      const messageWithEmphasis: Message = {
        id: "emphasis-1",
        role: "user",
        content: "This has *emphasized text* in it",
      };

      render(<ChatMessage message={messageWithEmphasis} />);

      const messageElement = screen.getByText(/This has/).parentElement;
      expect(messageElement?.innerHTML).toContain(
        '<span class="emphasized-text">*emphasized text*</span>'
      );
    });

    it("should escape HTML to prevent XSS", () => {
      const messageWithHTML: Message = {
        id: "html-1",
        role: "user",
        content: "<script>alert('xss')</script>",
      };

      render(<ChatMessage message={messageWithHTML} />);

      const messageElement = screen.getByText(/script/).parentElement;
      expect(messageElement?.innerHTML).toContain("&lt;script&gt;");
      expect(messageElement?.innerHTML).not.toContain("<script>");
    });

    it("should handle mixed formatting", () => {
      const complexMessage: Message = {
        id: "complex-1",
        role: "user",
        content: 'Text with "quotes" and *emphasis* and <tags>',
      };

      render(<ChatMessage message={complexMessage} />);

      const messageElement = screen.getByText(/Text with/).parentElement;
      const html = messageElement?.innerHTML || "";

      expect(html).toContain('<span class="quoted-text">"quotes"</span>');
      expect(html).toContain('<span class="emphasized-text">*emphasis*</span>');
      expect(html).toContain("&lt;tags&gt;");
    });
  });

  describe("delete functionality", () => {
    const mockOnDeleteMessage = vi.fn();
    const mockOnDeleteFromHere = vi.fn();
    const mockGetDeletePreview = vi.fn().mockReturnValue({
      messageCount: 5,
      pageCount: 2,
    });

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should show delete buttons when message is clicked and delete functions are provided", () => {
      render(
        <ChatMessage
          {...defaultProps}
          onDeleteMessage={mockOnDeleteMessage}
          onDeleteFromHere={mockOnDeleteFromHere}
        />
      );

      const messageElement = screen.getByText("This is a test message");
      expect(messageElement).toHaveClass("clickable");

      // Click to show delete buttons
      fireEvent.click(messageElement);

      expect(screen.getByTitle("Delete this message")).toBeInTheDocument();
      expect(
        screen.getByTitle("Delete this message and all below")
      ).toBeInTheDocument();
    });

    it("should not show delete buttons when no delete functions are provided", () => {
      render(<ChatMessage {...defaultProps} />);

      const messageElement = screen.getByText("This is a test message");
      expect(messageElement).not.toHaveClass("clickable");

      fireEvent.click(messageElement);

      expect(
        screen.queryByTitle("Delete this message")
      ).not.toBeInTheDocument();
    });

    it("should show single delete confirmation dialog", () => {
      render(
        <ChatMessage {...defaultProps} onDeleteMessage={mockOnDeleteMessage} />
      );

      // Click message to show buttons
      fireEvent.click(screen.getByText("This is a test message"));

      // Click single delete button
      fireEvent.click(screen.getByTitle("Delete this message"));

      expect(
        screen.getByText("Are you sure you want to delete this message?")
      ).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should show batch delete confirmation dialog with preview", () => {
      render(
        <ChatMessage
          {...defaultProps}
          onDeleteFromHere={mockOnDeleteFromHere}
          getDeletePreview={mockGetDeletePreview}
        />
      );

      // Click message to show buttons
      fireEvent.click(screen.getByText("This is a test message"));

      // Click batch delete button
      fireEvent.click(screen.getByTitle("Delete this message and all below"));

      expect(mockGetDeletePreview).toHaveBeenCalledWith("test-message-1");
      expect(
        screen.getByText(/This will delete 5 messages across 2 pages/)
      ).toBeInTheDocument();
    });

    it("should call onDeleteMessage when single delete is confirmed", () => {
      render(
        <ChatMessage {...defaultProps} onDeleteMessage={mockOnDeleteMessage} />
      );

      // Show delete buttons and confirm single delete
      fireEvent.click(screen.getByText("This is a test message"));
      fireEvent.click(screen.getByTitle("Delete this message"));
      fireEvent.click(screen.getByText("Delete"));

      expect(mockOnDeleteMessage).toHaveBeenCalledWith("test-message-1");
    });

    it("should call onDeleteFromHere when batch delete is confirmed", () => {
      render(
        <ChatMessage
          {...defaultProps}
          onDeleteFromHere={mockOnDeleteFromHere}
          getDeletePreview={mockGetDeletePreview}
        />
      );

      // Show delete buttons and confirm batch delete
      fireEvent.click(screen.getByText("This is a test message"));
      fireEvent.click(screen.getByTitle("Delete this message and all below"));
      fireEvent.click(screen.getByText("Delete"));

      expect(mockOnDeleteFromHere).toHaveBeenCalledWith("test-message-1");
    });

    it("should cancel delete when cancel button is clicked", () => {
      render(
        <ChatMessage {...defaultProps} onDeleteMessage={mockOnDeleteMessage} />
      );

      // Show delete confirmation and cancel
      fireEvent.click(screen.getByText("This is a test message"));
      fireEvent.click(screen.getByTitle("Delete this message"));
      fireEvent.click(screen.getByText("Cancel"));

      expect(mockOnDeleteMessage).not.toHaveBeenCalled();
      expect(
        screen.queryByText("Are you sure you want to delete this message?")
      ).not.toBeInTheDocument();
    });

    it("should toggle delete buttons on multiple clicks", () => {
      render(
        <ChatMessage {...defaultProps} onDeleteMessage={mockOnDeleteMessage} />
      );

      const messageElement = screen.getByText("This is a test message");

      // First click - show buttons
      fireEvent.click(messageElement);
      expect(screen.getByTitle("Delete this message")).toBeInTheDocument();

      // Second click - hide buttons
      fireEvent.click(messageElement);
      expect(
        screen.queryByTitle("Delete this message")
      ).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper button titles for screen readers", () => {
      render(
        <ChatMessage
          {...defaultProps}
          onDeleteMessage={vi.fn()}
          onDeleteFromHere={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText("This is a test message"));

      const singleDeleteButton = screen.getByTitle("Delete this message");
      const batchDeleteButton = screen.getByTitle(
        "Delete this message and all below"
      );

      expect(singleDeleteButton).toHaveAttribute(
        "title",
        "Delete this message"
      );
      expect(batchDeleteButton).toHaveAttribute(
        "title",
        "Delete this message and all below"
      );
    });

    it("should have proper button classes for styling", () => {
      render(
        <ChatMessage
          {...defaultProps}
          onDeleteMessage={vi.fn()}
          onDeleteFromHere={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText("This is a test message"));

      const singleDeleteButton = screen.getByTitle("Delete this message");
      const batchDeleteButton = screen.getByTitle(
        "Delete this message and all below"
      );

      expect(singleDeleteButton).toHaveClass("delete-button", "delete-single");
      expect(batchDeleteButton).toHaveClass(
        "delete-button",
        "delete-from-here"
      );
    });
  });
});
