import React from "react";
import { Accordion, Text, Stack, Box, Button, Group } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
  RiChatSettingsLine,
  RiFileList2Line,
  RiBookOpenLine,
} from "react-icons/ri";
import { LuBrain } from "react-icons/lu";
import { ChapterModal } from "./ChatControls/ChapterModal";
import { useAddChapter } from "./ChatControls/useAddChapter";

interface FlowAccordionProps {
  chatId: string;
}

export const FlowAccordion: React.FC<FlowAccordionProps> = ({ chatId }) => {
  const navigate = useNavigate();
  const {
    showModal,
    title,
    summary,
    nextChapterDirection,
    isGenerating,
    setTitle,
    setSummary,
    setNextChapterDirection,
    handleOpenModal,
    handleCloseModal,
    handleGenerateSummary,
    handleSubmit,
  } = useAddChapter({ chatId });

  const flowSections = [
    {
      key: "settings",
      title: "Chat Settings",
      icon: <RiChatSettingsLine size={18} />,
      onClick: () => navigate(`/chat/${chatId}/edit`),
    },
    {
      key: "notes",
      title: "Story Notes",
      icon: <RiFileList2Line size={18} />,
      onClick: () => navigate(`/chat/${chatId}/notes`),
    },
    {
      key: "memories",
      title: "Memories",
      icon: <LuBrain size={18} />,
      onClick: () => navigate(`/chat/${chatId}/memories`),
    },
    {
      key: "chapter",
      title: "Add Chapter",
      icon: <RiBookOpenLine size={18} />,
      onClick: handleOpenModal,
    },
  ];

  return (
    <Box
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        position: "relative",
        zIndex: 10,
      }}
    >
      <Accordion
        variant="filled"
        styles={{
          root: {
            backgroundColor: "transparent",
          },
          control: {
            backgroundColor: "rgba(30, 30, 30, 0.95)",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "rgba(50, 50, 50, 0.95)",
            },
          },
          label: {
            fontSize: "14px",
            fontWeight: 600,
          },
          content: {
            backgroundColor: "rgba(20, 20, 20, 0.95)",
            padding: 0,
          },
          item: {
            border: "none",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          },
          chevron: {
            color: "#ffffff",
          },
        }}
      >
        <Accordion.Item value="flow">
          <Accordion.Control>Flow</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs" p="md">
              {flowSections.map((section) => (
                <Button
                  key={section.key}
                  variant="subtle"
                  color="gray"
                  fullWidth
                  justify="flex-start"
                  leftSection={section.icon}
                  onClick={section.onClick}
                  styles={{
                    root: {
                      backgroundColor: "rgba(40, 40, 40, 0.6)",
                      color: "#ffffff",
                      "&:hover": {
                        backgroundColor: "rgba(60, 60, 60, 0.8)",
                      },
                    },
                  }}
                >
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      {section.title}
                    </Text>
                  </Group>
                </Button>
              ))}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <ChapterModal
        opened={showModal}
        title={title}
        summary={summary}
        nextChapterDirection={nextChapterDirection}
        isGenerating={isGenerating}
        onTitleChange={setTitle}
        onSummaryChange={setSummary}
        onNextChapterDirectionChange={setNextChapterDirection}
        onGenerateSummary={handleGenerateSummary}
        onSubmit={handleSubmit}
        onCancel={handleCloseModal}
      />
    </Box>
  );
};
