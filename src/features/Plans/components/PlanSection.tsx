import React, { useState } from "react";
import { Box, Group, Text } from "@mantine/core";
import { RiFileList2Line } from "react-icons/ri";
import { Theme } from "../../../components/Common/Theme";
import type { Plan } from "../services/Plan";
import { ContentPreview } from "../../Chat/components/Chat/Flow/ContentPreview";
import { FlowButton } from "../../Chat/components/Chat/Flow/FlowButton";
import { PreviewItem } from "../../Chat/components/Chat/Flow/PreviewItem";

interface PlanSectionProps {
  plans: Plan[];
  onNavigate: () => void;
}

export const PlanSection: React.FC<PlanSectionProps> = ({
  plans,
  onNavigate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderPlanItem = (plan: Plan) => (
    <PreviewItem
      key={plan.id}
      name={plan.name}
      description={plan.prompt}
      content={plan.content}
      isExpanded={isExpanded}
    />
  );

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
      <ContentPreview
        items={plans}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        renderItem={renderPlanItem}
        emptyMessage="No plans configured"
      />
    </Box>
  );
};
