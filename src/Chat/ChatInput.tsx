import { useState, type FormEvent, forwardRef } from "react";
import { IoSend, IoSync } from "react-icons/io5";
import "./ChatInput.css";

export interface ChatInputProps {
  onSubmit: (inputValue: string) => void;
  onGenerateImage: () => void;
  isSending: boolean;
  placeholder: string;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ onSubmit, onGenerateImage, isSending, placeholder }, ref) => {
    const [internalInputValue, setInternalInputValue] = useState<string>("");

    const handleFormSubmit = (event: FormEvent) => {
      event.preventDefault();
      if (!internalInputValue.trim()) return;

      onSubmit(internalInputValue);

      setInternalInputValue("");
    };

    const handleGenerateImage = () => {
      onGenerateImage();
    };

    return (
      <form onSubmit={handleFormSubmit} className="chat-input-form">
        <textarea
          ref={ref}
          value={internalInputValue}
          onChange={(e) => setInternalInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={isSending}
          className="chat-input-field"
          rows={3}
        />
        <button
          type="button"
          disabled={isSending}
          onClick={handleGenerateImage}
          className="chat-input-button photo-button"
          aria-label="Generate Image"
        >
          📷
        </button>
        <button
          type="submit"
          disabled={isSending}
          className="chat-input-button"
          aria-label={isSending ? "Sending..." : "Send"}
        >
          {isSending ? (
            <IoSync size={20} className="spinning" />
          ) : (
            <IoSend size={20} />
          )}
        </button>
      </form>
    );
  }
);
