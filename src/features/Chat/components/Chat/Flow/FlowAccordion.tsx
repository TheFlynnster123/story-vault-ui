import React from "react";
import { Accordion, Stack, Box } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { FlowStyles } from "./FlowStyles";
import { ChapterSection } from "./ChapterSection";
import { BookSection } from "./BookSection";
import { NoteSection } from "./NoteSection";
import { ChatSettingsButton } from "./ChatSettingsButton";
import { ChatImageModelsSection } from "./ChatImageModelsSection";
import { usePlanCache } from "../../../../Plans/hooks/usePlanCache";
import { PlanSection } from "../../../../Plans/components/PlanSection";
import { MemoriesSection } from "../../../../Memories/components/MemoriesSection";

interface FlowAccordionProps {
  chatId: string;
}

export const FlowAccordion: React.FC<FlowAccordionProps> = ({ chatId }) => {
  const navigate = useNavigate();
  const { plans } = usePlanCache(chatId);

  const navigateToChatSettings = () => navigate(`/chat/${chatId}/edit`);
  const navigateToPlan = () => navigate(`/chat/${chatId}/plan`);
  const navigateToMemories = () => navigate(`/chat/${chatId}/memories`);
  const navigateToChatImageModels = () =>
    navigate(`/chat/${chatId}/image-models`);

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
              <BookSection chatId={chatId} />
              <NoteSection chatId={chatId} />
              <ChatSettingsButton onClick={navigateToChatSettings} />
              <PlanSection
                chatId={chatId}
                plans={plans}
                onNavigate={navigateToPlan}
              />
              <MemoriesSection
                chatId={chatId}
                onNavigate={navigateToMemories}
              />
              <ChatImageModelsSection
                chatId={chatId}
                onNavigate={navigateToChatImageModels}
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
