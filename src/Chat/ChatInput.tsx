import { useState, type FormEvent, forwardRef } from "react";
import "./ChatInput.css";

export interface ChatInputProps {
  onSubmit: (inputValue: string) => void;
  isSending: boolean;
  isDisabled: boolean;
  placeholder: string;
  toggleMenu: () => any;
}
export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  ({ onSubmit, isSending, isDisabled, placeholder, toggleMenu }, ref) => {
    const [internalInputValue, setInternalInputValue] = useState<string>("");

    const handleFormSubmit = (event: FormEvent) => {
      event.preventDefault();
      if (!internalInputValue.trim()) return;
      onSubmit(internalInputValue);
      setInternalInputValue("");
    };

    return (
      <form onSubmit={handleFormSubmit} className="chat-input-form">
        <button
          className="chat-menu-button"
          type="button"
          onClick={() => toggleMenu()}
        >
          Menu
        </button>
        <input
          ref={ref}
          type="text"
          value={internalInputValue}
          onChange={(e) => setInternalInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={isDisabled || isSending}
          className="chat-input-field"
        />
        <button
          type="submit"
          disabled={isDisabled || isSending}
          className="chat-input-button"
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    );
  }
);
