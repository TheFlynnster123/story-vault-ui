import { LuMegaphone } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

export const SystemPromptsButton = () => {
  const navigate = useNavigate();

  return (
    <StyledButton
      onClick={() => navigate("/system-prompts")}
      aria-label="Open system prompts"
      title="System Prompts"
    >
      <LuMegaphone />
    </StyledButton>
  );
};

const StyledButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;
