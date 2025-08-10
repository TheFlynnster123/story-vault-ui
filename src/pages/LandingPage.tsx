import React from "react";
import styled from "styled-components";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { useGrokKey } from "../hooks/useGrokKey";
import { GrokKeyInput } from "../GrokKeyInput";
import { useAuth0Setup } from "../hooks/useAuth0Setup";

const LandingPage: React.FC = () => {
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const { hasValidGrokKey, refreshGrokKeyStatus } = useGrokKey();
  const navigate = useNavigate();

  useAuth0Setup();

  React.useEffect(() => {
    if (isAuthenticated && hasValidGrokKey === true) {
      navigate("/chat");
    }
  }, [isAuthenticated, hasValidGrokKey, navigate]);

  const handleGrokKeyUpdated = () => {
    refreshGrokKeyStatus();
  };

  if (!isAuthenticated) {
    return (
      <LoginContainer>
        <LoginButton onClick={() => loginWithRedirect()}>Log in</LoginButton>
      </LoginContainer>
    );
  }

  if (hasValidGrokKey === undefined) {
    return <LoadingContainer>Loading Grok Key status...</LoadingContainer>;
  }

  if (!hasValidGrokKey) {
    return <GrokKeyInput onGrokKeyUpdated={handleGrokKeyUpdated} />;
  }

  return <LoadingContainer>Redirecting to chat...</LoadingContainer>;
};

const LoginContainer = styled.div`
  width: 100%;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
`;

const LoadingContainer = styled.div`
  width: 100%;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
`;

const LoginButton = styled.button`
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #0056b3;
  }
`;

export default LandingPage;
