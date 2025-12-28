import styled from "styled-components";

export const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
`;

export const Dialog = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;

  @media (prefers-color-scheme: dark) {
    background: #3a3a3a;
    color: #e5e5e5;
  }
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e5;

  @media (prefers-color-scheme: dark) {
    border-color: #555;
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;

  @media (prefers-color-scheme: dark) {
    color: #ccc;
  }

  &:hover {
    color: #333;

    @media (prefers-color-scheme: dark) {
      color: #fff;
    }
  }
`;

export const Content = styled.div`
  padding: 20px;
  font-size: 1rem;
  color: #333;

  @media (prefers-color-scheme: dark) {
    color: #e5e5e5;
  }

  p {
    margin-top: 0;
    margin-bottom: 16px;
  }

  textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;

    @media (prefers-color-scheme: dark) {
      background-color: #2a2a2a;
      border-color: #555;
      color: #e5e5e5;
    }

    &:focus {
      outline: none;
      border-color: #4a90e2;

      @media (prefers-color-scheme: dark) {
        border-color: #6bb6ff;
      }
    }
  }
`;

export const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e5e5e5;

  @media (prefers-color-scheme: dark) {
    border-color: #555;
  }
`;

export const ConfirmButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background-color: #4a90e2;
  color: white;
  border: none;

  &:hover:not(:disabled) {
    background-color: #357abd;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;

    @media (prefers-color-scheme: dark) {
      background-color: #555;
      color: #999;
    }
  }
`;
