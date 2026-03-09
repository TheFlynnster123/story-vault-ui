import React from "react";
import { Box, Group, Text } from "@mantine/core";
import { RiFileList2Line } from "react-icons/ri";
import { Theme } from "../../../components/Theme";
import type { Plan } from "../services/Plan";
import { formatRefreshStatus } from "../services/Plan";
import { FlowButton } from "../../Chat/components/Chat/Flow/FlowButton";

interface PlanSectionProps {
  plans: Plan[];
  onNavigate: () => void;
}

const buildPlanDescription = (plan: Plan): string =>
  `⟳ ${formatRefreshStatus(plan)} until refresh`;

export const PlanSection: React.FC<PlanSectionProps> = ({
  plans,
  onNavigate,
}) => {
  return (
    <Box>
      <FlowButton
        onClick={onNavigate}
        leftSection={<RiFileList2Line size={18} color={Theme.plan.primary} />}
      >
        <Group gap="xs">
          <Text size="sm" fw={500}>
            Plan
          </Text>
          <Text size="xs" c="dimmed">
            ({plans.length})
          </Text>
        </Group>
      </FlowButton>
      {plans.length > 0 && (
        <Box pl="md" pt={4}>
          {plans.map((plan) => (
            <Text key={plan.id} size="xs" c="dimmed">
              {plan.name} — {buildPlanDescription(plan)}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
};
