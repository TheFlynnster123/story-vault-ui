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
  chainOfThought: ChainOfThought | null;
  onNavigate: () => void;
}

const buildChainOfThoughtDescription = (cot: ChainOfThought): string => {
  const enabledSteps = cot.steps.filter((step) => step.enabled).length;
  const lastExecution = cot.lastExecution;

  if (lastExecution) {
    const executedDate = new Date(lastExecution.executedAt);
    const now = new Date();
    const diffMs = now.getTime() - executedDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return `${enabledSteps} steps • Just now`;
    if (diffMins < 60) return `${enabledSteps} steps • ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${enabledSteps} steps • ${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${enabledSteps} steps • ${diffDays}d ago`;
  }

  return `${enabledSteps} step${enabledSteps !== 1 ? "s" : ""}`;
};

export const ChainOfThoughtSection: React.FC<
  ChainOfThoughtSectionProps
> = ({ chatId, chainOfThought, onNavigate }) => {
  const { isGenerating } = useChainOfThoughtGenerationStatus(chatId);

  if (!chainOfThought) return null;

  return (
    <Box>
      <FlowButton
        onClick={onNavigate}
        leftSection={
          <RiBrainLine size={18} color={Theme.chainOfThought.primary} />
        }
      >
        <Text size="sm" fw={500}>
          Chain of Thought
        </Text>
      </FlowButton>
      <Box pl="md" pt={4}>
        <ChainOfThoughtStatusLine
          cot={chainOfThought}
          isGenerating={isGenerating}
        />
      </Box>
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
