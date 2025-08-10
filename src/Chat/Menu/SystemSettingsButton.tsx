import { RiSettings3Fill } from "react-icons/ri";
import { SystemSettingsDialog } from "../../SystemSettings";
import { useState } from "react";
import styled from "styled-components";

export const SystemSettingsButton = () => {
  const [showSystemSettings, setShowSystemSettings] = useState<boolean>(false);

  return (
    <>
      <StyledButton
        onClick={() => setShowSystemSettings(true)}
        aria-label="Open system settings"
        title="System Settings"
      >
        <RiSettings3Fill />
      </StyledButton>
      <SystemSettingsDialog
        isOpen={showSystemSettings}
        onClose={() => setShowSystemSettings(false)}
      />
    </>
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
    transform: rotate(90deg);
  }

  &:active {
    transform: rotate(90deg) scale(0.95);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;
