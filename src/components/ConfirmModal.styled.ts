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
  max-width: 400px;

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
`;

export const Content = styled.div`
  padding: 20px;
  font-size: 1rem;
  color: #333;

  @media (prefers-color-scheme: dark) {
    color: #e5e5e5;
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

export const CancelButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background-color: #f0f0f0;
  border: 1px solid #ccc;

  @media (prefers-color-scheme: dark) {
    background-color: #555;
    border-color: #777;
    color: #e5e5e5;
  }
`;

export const ConfirmButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background-color: #dc3545;
  color: white;
  border: 1px solid transparent;

  @media (prefers-color-scheme: dark) {
    background-color: #c82333;
  }
`;
