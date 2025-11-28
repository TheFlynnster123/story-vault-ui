import styled, { keyframes } from "styled-components";

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

export const SpinningIcon = styled.span`
  animation: ${spin} 1s infinite linear;
  display: inline-flex;
`;
