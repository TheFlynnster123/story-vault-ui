import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { RiTreasureMapFill } from "react-icons/ri";
import { Theme } from "../../../components/Theme";
import { DiscussionPage } from "./DiscussionPage";
import { DiscussionService } from "../services/DiscussionService";
import { createPlanDiscussionConfig } from "../services/PlanDiscussionConfig";
import type { DiscussionPageConfig } from "./DiscussionPageConfig";

const pageConfig: DiscussionPageConfig = {
  primaryColor: Theme.plan.primary,
  borderColor: Theme.plan.border,
  assistantBubbleBackground: Theme.plan.backgroundSecondary,
  accentColor: "teal",
  icon: <RiTreasureMapFill size={24} color={Theme.plan.primary} />,
  title: "Discuss Plan",
  description:
    'Discuss the plan with the AI. When you\'re satisfied, click "Generate Updated Story Plan" to regenerate the plan using this conversation as feedback.',
  inputPlaceholder: "Discuss plan…",
  generateButtonLabel: "Generate Updated Story Plan",
  finalFeedbackButtonLabel: "Send & Generate Plan",
  emptyStateText:
    "Start a conversation about your plan. Ask questions, suggest ideas, or discuss what should happen next.",
};

export const DiscussPlanPage: React.FC = () => {
  const { chatId, planId } = useParams<{ chatId: string; planId: string }>();

  const service = useMemo(
    () => new DiscussionService(createPlanDiscussionConfig(chatId!, planId!)),
    [chatId, planId],
  );

  return (
    <DiscussionPage chatId={chatId!} service={service} config={pageConfig} />
  );
};
