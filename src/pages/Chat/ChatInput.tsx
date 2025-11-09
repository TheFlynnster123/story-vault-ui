import { useState, type FormEvent, forwardRef } from "react";
import { IoCamera, IoSend, IoSync } from "react-icons/io5";
import "./ChatInput.css";
import { useChatGeneration } from "../../hooks/useChatGeneration";

export interface ChatInputProps {
  chatId: string;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ chatId }, ref) => {
    const [internalInputValue, setInternalInputValue] = useState<string>("");

    const { generateImage, generateResponse, isLoading } = useChatGeneration({
      chatId,
    });

    const handleFormSubmit = (event: FormEvent) => {
      event.preventDefault();
      if (!internalInputValue.trim()) return;

      generateResponse(internalInputValue);

      setInternalInputValue("");
    };

    return (
      <form onSubmit={handleFormSubmit} className="chat-input-form">
        <textarea
          ref={ref}
          value={internalInputValue}
          onChange={(e) => setInternalInputValue(e.target.value)}
          placeholder={"Type your message here..."}
          disabled={isLoading}
          className="chat-input-field"
          rows={3}
        />
        <button
          type="button"
          disabled={isLoading}
          onClick={generateImage}
          className="chat-input-button photo-button"
          aria-label="Generate Image"
        >
          {isLoading ? (
            <IoSync size={20} className="spinning" />
          ) : (
            <IoCamera size={20} />
          )}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="chat-input-button"
          aria-label={isLoading ? "Sending..." : "Send"}
        >
          {isLoading ? (
            <IoSync size={20} className="spinning" />
          ) : (
            <IoSend size={20} />
          )}
        </button>
      </form>
    );
  }
);
