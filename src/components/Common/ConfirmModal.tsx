import React from "react";
import {
  Actions,
  CancelButton,
  CloseButton,
  ConfirmButton,
  Content,
  Dialog,
  Header,
  Overlay,
} from "./ConfirmModal.styled";

interface ConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  title,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <Overlay>
      <Dialog>
        <Header>
          <h2>{title}</h2>
          <CloseButton onClick={onCancel}>×</CloseButton>
        </Header>

        <Content>
          <p>{message}</p>
        </Content>

        <Actions>
          <CancelButton onClick={onCancel}>Cancel</CancelButton>
          <ConfirmButton onClick={onConfirm}>Confirm</ConfirmButton>
        </Actions>
      </Dialog>
    </Overlay>
  );
};
