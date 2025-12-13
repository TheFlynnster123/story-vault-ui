import React from "react";
import { Accordion, Stack, Box } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { usePlanCache } from "../../../hooks/usePlanCache";
import { FlowStyles } from "./FlowStyles";
import { ChapterSection } from "./ChapterSection";
import { ChatSettingsButton } from "./ChatSettingsButton";
import { PlanSection } from "./PlanSection";
import { MemoriesSection } from "./MemoriesSection";

interface FlowAccordionProps {
  chatId: string;
}

export const FlowAccordion: React.FC<FlowAccordionProps> = ({ chatId }) => {
  const navigate = useNavigate();
  const { plans } = usePlanCache(chatId);

  const navigateToChatSettings = () => navigate(`/chat/${chatId}/edit`);
  const navigateToPlan = () => navigate(`/chat/${chatId}/plan`);
  const navigateToMemories = () => navigate(`/chat/${chatId}/memories`);

  return (
    <Box
      style={{
        backgroundColor: FlowStyles.background,
        borderTop: `1px solid ${FlowStyles.border}`,
        position: "relative",
        zIndex: 10,
      }}
    >
      <Accordion variant="filled" styles={getAccordionStyles()}>
        <Accordion.Item value="flow">
          <Accordion.Control>Flow</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs" p="md">
              <ChapterSection chatId={chatId} />
              <ChatSettingsButton onClick={navigateToChatSettings} />
              <PlanSection plans={plans} onNavigate={navigateToPlan} />
              <MemoriesSection
                chatId={chatId}
                onNavigate={navigateToMemories}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Box>
  );
};

const getAccordionStyles = () => ({
  root: {
    backgroundColor: "transparent",
  },
  control: {
    backgroundColor: FlowStyles.controlBackground,
    color: FlowStyles.text,
    "&:hover": {
      backgroundColor: FlowStyles.controlHover,
    },
  },
  label: {
    fontSize: "14px",
    fontWeight: 600,
  },
  content: {
    backgroundColor: FlowStyles.contentBackground,
    padding: 0,
  },
  item: {
    border: "none",
    borderBottom: `1px solid ${FlowStyles.border}`,
  },
  chevron: {
    color: FlowStyles.text,
  },
});
