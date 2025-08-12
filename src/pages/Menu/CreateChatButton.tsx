import { Button } from "@mantine/core";
import React from "react";
import { useNavigate } from "react-router-dom";

export const CreateChatButton: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateChat = () => {
    navigate("/chat/new");
  };

  return (
    <Button
      key="create"
      onClick={handleCreateChat}
      variant="gradient"
      size="xl"
      style={{ margin: "1rem", minHeight: "60px" }}
    >
      Create New Chat
    </Button>
  );
};
