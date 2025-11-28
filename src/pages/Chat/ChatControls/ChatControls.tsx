import React from "react";
import { RiArrowGoBackLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { ActionIcon } from "@mantine/core";
import styled from "styled-components";

export const ChatControls: React.FC = () => {
  const navigate = useNavigate();

  return (
    <ControlsContainer>
      <ActionIcon
        onClick={() => navigate(-1)}
        variant="gradient"
        title="Back"
        size="xl"
      >
        <RiArrowGoBackLine />
      </ActionIcon>
    </ControlsContainer>
  );
};

const ControlsContainer = styled.div`
  position: fixed;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 1000;
`;
