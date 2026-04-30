import React from "react";
import { Box, Group, Text } from "@mantine/core";
import { RiTreasureMapFill } from "react-icons/ri";
import { VscRefresh } from "react-icons/vsc";
import styled, { keyframes } from "styled-components";
import { Theme } from "../../../components/Theme";
import type { Plan } from "../services/Plan";
import { formatRefreshStatus, isAutoRefreshDisabled } from "../services/Plan";
import { FlowButton } from "../../Chat/components/Chat/Flow/FlowButton";
import { usePlanGenerationStatus } from "../hooks/usePlanGenerationStatus";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SpinningRefreshIcon = styled.span`
  animation: ${spin} 1s linear infinite;
  display: inline-flex;
  align-items: center;
`;

interface PlanSectionProps {
  chatId: string;
  plans: Plan[];
  onNavigate: () => void;
}

const buildPlanDescription = (plan: Plan): string =>
  `⟳ ${formatRefreshStatus(plan)} until refresh`;

export const PlanSection: React.FC<PlanSectionProps> = ({
  chatId,
  plans,
  onNavigate,
}) => {
  const { isGenerating } = usePlanGenerationStatus(chatId);
  const hasManualOnlyPlans = plans.some(isAutoRefreshDisabled);

  return (
    <Box>
      <FlowButton
        onClick={onNavigate}
        leftSection={<RiTreasureMapFill size={18} color={Theme.plan.primary} />}
      >
        <Box ta="left">
          <Group gap="xs">
            <Text size="sm" fw={500}>
              Plans
            </Text>
            <Text size="xs" c="dimmed">
              ({plans.length})
            </Text>
          </Group>
          {hasManualOnlyPlans && (
            <Text size="xs" c="dimmed">
              Some plans are set to manual-only mode.
            </Text>
          )}
        </Box>
      </FlowButton>
      {plans.length > 0 && (
        <Box pl="md" pt={4}>
          {plans.map((plan) => (
            <PlanStatusLine
              key={plan.id}
              plan={plan}
              isGenerating={isGenerating(plan.id)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

interface PlanStatusLineProps {
  plan: Plan;
  isGenerating: boolean;
}

const PlanStatusLine: React.FC<PlanStatusLineProps> = ({
  plan,
  isGenerating,
}) => {
  if (isGenerating) {
    return (
      <Group gap={6} align="center">
        <SpinningRefreshIcon>
          <VscRefresh size={12} color={Theme.plan.primary} />
        </SpinningRefreshIcon>
        <Text size="xs" c={Theme.plan.primary} fw={500}>
          {plan.name} — Updating…
        </Text>
      </Group>
    );
  }

  return (
    <Text size="xs" c="dimmed">
      {plan.name} —{" "}
      {isAutoRefreshDisabled(plan)
        ? "Manual generation only"
        : buildPlanDescription(plan)}
    </Text>
  );
};
