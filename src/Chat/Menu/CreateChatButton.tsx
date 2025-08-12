import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

export const CreateChatButton: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateChat = () => {
    navigate("/chat/new");
  };

  return (
    <StyledCreateChatButton key="create" onClick={handleCreateChat}>
      Create New Chat
    </StyledCreateChatButton>
  );
};

const StyledCreateChatButton = styled.div`
  padding: 10px 15px;
  margin-bottom: 1rem;
  border-radius: 5px;
  cursor: pointer;
  color: #007bff;
  transition: background-color 0.2s ease-in-out;
  background-color: rgba(0, 0, 0, 0.7);
  position: relative;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  text-align: center;

  &:hover {
    background-color: black;
  }
`;
