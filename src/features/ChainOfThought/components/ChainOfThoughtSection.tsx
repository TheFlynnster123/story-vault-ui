import React from "react";
import { Box, Group, Text } from "@mantine/core";
import { RiBrainLine } from "react-icons/ri";
import { VscRefresh } from "react-icons/vsc";
import styled, { keyframes } from "styled-components";
import { Theme } from "../../../components/Theme";
import type { ChainOfThought } from "../services/ChainOfThought";
import { FlowButton } from "../../Chat/components/Chat/Flow/FlowButton";
import { useChainOfThoughtGenerationStatus } from "../hooks/useChainOfThoughtGenerationStatus";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SpinningRefreshIcon = styled.span`
  animation: ${spin} 1s linear infinite;
  display: inline-flex;
  align-items: center;
`;

interface ChainOfThoughtSectionProps {
  chatId: string;
  chainOfThoughts: ChainOfThought[];
  onNavigate: () => void;
}

const buildChainOfThoughtDescription = (cot: ChainOfThought): string => {
  const enabledSteps = cot.steps.filter((step) => step.enabled).length;
  return `${enabledSteps} step${enabledSteps !== 1 ? "s" : ""}`;
};

export const ChainOfThoughtSection: React.FC<
  ChainOfThoughtSectionProps
> = ({ chatId, chainOfThoughts, onNavigate }) => {
  const { isGenerating } = useChainOfThoughtGenerationStatus(chatId);

  return (
    <Box>
      <FlowButton
        onClick={onNavigate}
        leftSection={
          <RiBrainLine size={18} color={Theme.chainOfThought.primary} />
        }
      >
        <Group gap="xs">
          <Text size="sm" fw={500}>
            Chain of Thought
          </Text>
          <Text size="xs" c="dimmed">
            ({chainOfThoughts.length})
          </Text>
        </Group>
      </FlowButton>
      {chainOfThoughts.length > 0 && (
        <Box pl="md" pt={4}>
          {chainOfThoughts.map((cot) => (
            <ChainOfThoughtStatusLine
              key={cot.id}
              cot={cot}
              isGenerating={isGenerating(cot.id)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

interface ChainOfThoughtStatusLineProps {
  cot: ChainOfThought;
  isGenerating: boolean;
}

const ChainOfThoughtStatusLine: React.FC<ChainOfThoughtStatusLineProps> = ({
  cot,
  isGenerating,
}) => {
  if (isGenerating) {
    return (
      <Group gap={6} align="center">
        <SpinningRefreshIcon>
          <VscRefresh size={12} color={Theme.chainOfThought.primary} />
        </SpinningRefreshIcon>
        <Text size="xs" c={Theme.chainOfThought.primary} fw={500}>
          {cot.name} — Executing…
        </Text>
      </Group>
    );
  }

  return (
    <Text size="xs" c="dimmed">
      {cot.name} — {buildChainOfThoughtDescription(cot)}
    </Text>
  );
};
