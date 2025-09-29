import { useState, type FormEvent, forwardRef } from "react";
import { IoCamera, IoSend, IoSync } from "react-icons/io5";
import "./ChatInput.css";

export interface ChatInputProps {
  onSubmit: (inputValue: string) => void;
  onGenerateImage: () => void;
  isLoading: boolean;
  placeholder: string;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ onSubmit, onGenerateImage, isLoading, placeholder }, ref) => {
    const [internalInputValue, setInternalInputValue] = useState<string>("");

    const handleFormSubmit = (event: FormEvent) => {
      event.preventDefault();
      if (!internalInputValue.trim()) return;

      console.log("yo");
      onSubmit(internalInputValue);

      console.log("yo2");
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
          disabled={isLoading}
          className="chat-input-field"
          rows={3}
        />
        <button
          type="button"
          disabled={isLoading}
          onClick={handleGenerateImage}
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
