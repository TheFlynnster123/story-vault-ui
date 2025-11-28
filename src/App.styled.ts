import styled, { keyframes } from "styled-components";

export const Root = styled.div`
  margin: 0;
  text-align: center;
`;

const logoSpin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

export const Logo = styled.img`
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;

  &:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }

  &.react:hover {
    filter: drop-shadow(0 0 2em #61dafbaa);
  }

  @media (prefers-reduced-motion: no-preference) {
    a:nth-of-type(2) & {
      animation: ${logoSpin} infinite 20s linear;
    }
  }
`;

export const Card = styled.div`
  padding: 2em;
`;

export const ReadTheDocs = styled.p`
  color: #888;
`;
