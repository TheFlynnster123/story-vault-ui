import styled from 'styled-components';

export const ChatFlowCollapsible = styled.div`
  margin: 16px 10px;
  border-radius: 8px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  overflow: hidden;
`;

export const ChatFlowHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
`;

export const ChatFlowToggle = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
  padding: 12px 16px;
  background-color: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #f3f4f6;
  }
`;

export const DeleteNotesButton = styled.button`
  padding: 8px 12px;
  margin-right: 8px;
  background-color: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background-color: #fee2e2;
    border-color: #fca5a5;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ChatFlowHistory = styled.div`
  padding: 16px;
  background-color: #fff;
`;

export const ChatFlowStep = styled.div`
  margin-bottom: 16px;
  padding-left: 16px;
  border-left-width: 4px;
  border-left-style: solid;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const ChatFlowStepHeader = styled.div`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const StepTimestamp = styled.span`
  font-size: 10px;
  font-weight: 400;
  text-transform: none;
  opacity: 0.6;
  margin-left: 8px;
`;

export const ChatFlowStepContent = styled.div`
  font-size: 14px;
  line-height: 1.6;
  color: #4b5563;
  white-space: pre-wrap;
`;

export const DeleteConfirmOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const DeleteConfirmDialog = styled.div`
  background-color: #fff;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);

  h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: #374151;
  }

  p {
    margin: 0 0 24px 0;
    font-size: 14px;
    line-height: 1.6;
    color: #6b7280;
  }
`;

export const DeleteConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

export const DeleteConfirmCancel = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #d1d5db;
  background-color: #fff;
  color: #374151;

  &:hover:not(:disabled) {
    background-color: #f9fafb;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const DeleteConfirmDelete = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #dc2626;
  background-color: #dc2626;
  color: #fff;

  &:hover:not(:disabled) {
    background-color: #b91c1c;
    border-color: #b91c1c;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
