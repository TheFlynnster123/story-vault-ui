import React, { useEffect, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { RiSettings3Line } from "react-icons/ri";
import { LuSparkles } from "react-icons/lu";
import { v4 as uuidv4 } from "uuid";
import { d } from "../../../../../services/Dependencies";
import { Theme } from "../../../../../components/Theme";
import type {
  AgentFlowAction,
  AgentIntent,
  AgentFlowSuggestion,
} from "../../../services/AgentFlow/AgentFlowService";
import { FlowButton } from "./FlowButton";
import { FlowStyles } from "./FlowStyles";
import { useLongPress } from "../../../hooks/useLongPress";
import { CreateNoteModal } from "../ChatControls/CreateNoteModal";
import { CreateChapterModal } from "../ChatControls/CreateChapterModal";

interface AgentFlowSectionProps {
  chatId: string;
  onNavigateToMemories: () => void;
  onNavigateToPlans: () => void;
  onNavigateToSettings: () => void;
}

export const AgentFlowSection: React.FC<AgentFlowSectionProps> = ({
  chatId,
  onNavigateToMemories,
  onNavigateToPlans,
  onNavigateToSettings,
}) => {
  const agentFlowService = d.AgentFlowService(chatId);
  const [suggestion, setSuggestion] = useState<AgentFlowSuggestion | null>(
    agentFlowService.CurrentSuggestion,
  );
  const [isLoading, setIsLoading] = useState(agentFlowService.IsLoading);
  const [runningActionIndex, setRunningActionIndex] = useState<number | null>(
    null,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [isIntentModalOpen, setIsIntentModalOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState({
    opened: false,
    content: "",
    hasExpiration: false,
    expiresAfterMessages: 10,
  });
  const [chapterDraft, setChapterDraft] = useState({
    opened: false,
    title: "",
    summary: "",
    isGeneratingTitle: false,
    isCreating: false,
  });
  const [clarificationDraft, setClarificationDraft] = useState({
    opened: false,
    question: "",
    answer: "",
    options: [] as string[],
  });
  const longPress = useLongPress(() => setIsIntentModalOpen(true));

  useEffect(() => {
    const updateState = () => {
      setSuggestion(agentFlowService.CurrentSuggestion);
      setIsLoading(agentFlowService.IsLoading);
    };
    return agentFlowService.subscribe(updateState);
  }, [agentFlowService]);

  const analyzeFlow = async (selectedIntent?: AgentIntent) => {
    setStatus(null);
    try {
      await agentFlowService.analyzeIntentSuggestion(selectedIntent);
    } catch (error) {
      d.ErrorService().log("Failed to analyze agent flow", error);
      setStatus("Could not analyze flow.");
    }
  };

  const startLongPress = (event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
    longPress.start();
  };

  const completePress = (event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
    longPress.cancel();

    if (!longPress.wasLongPress()) {
      void analyzeFlow();
    }
  };

  const selectIntent = (intent: AgentIntent) => {
    setIsIntentModalOpen(false);
    void analyzeFlow(intent);
  };

  const runAction = async (action: AgentFlowAction, index: number) => {
    setRunningActionIndex(index);
    setStatus(null);
    try {
      const result = await executeAction(
        chatId,
        action,
        onNavigateToMemories,
        onNavigateToPlans,
        openNoteDraft,
        openChapterDraft,
        openClarificationDraft,
      );
      setStatus(result);
    } catch (error) {
      d.ErrorService().log("Failed to run agent action", error);
      setStatus("Action failed.");
    } finally {
      setRunningActionIndex(null);
    }
  };

  const openClarificationDraft = (
    question: string,
    options: string[] = [],
  ) => {
    setClarificationDraft({
      opened: true,
      question,
      answer: "",
      options,
    });
  };

  const closeClarificationDraft = () => {
    setClarificationDraft((draft) => ({ ...draft, opened: false }));
  };

  const submitClarificationDraft = async () => {
    const answer = clarificationDraft.answer.trim();
    if (!answer) return;

    await d
      .ChatService(chatId)
      .AddAgentClarification(clarificationDraft.question, answer);
    closeClarificationDraft();
    setStatus("Clarification saved.");
  };

  const openNoteDraft = (content: string = "") => {
    setNoteDraft({
      opened: true,
      content,
      hasExpiration: false,
      expiresAfterMessages: 10,
    });
  };

  const closeNoteDraft = () => {
    setNoteDraft((draft) => ({ ...draft, opened: false }));
  };

  const submitNoteDraft = async () => {
    const content = noteDraft.content.trim();
    if (!content) return;

    await d.ChatService(chatId).AddNote(
      content,
      noteDraft.hasExpiration ? noteDraft.expiresAfterMessages : null,
    );
    closeNoteDraft();
    setStatus("Note added.");
  };

  const openChapterDraft = (title: string = "", summary: string = "") => {
    setChapterDraft({
      opened: true,
      title,
      summary,
      isGeneratingTitle: false,
      isCreating: false,
    });
  };

  const closeChapterDraft = () => {
    setChapterDraft((draft) => ({ ...draft, opened: false }));
  };

  const submitChapterDraft = async () => {
    const title = chapterDraft.title.trim();
    const summary = chapterDraft.summary.trim();
    if (!title || !summary) return;

    setChapterDraft((draft) => ({ ...draft, isCreating: true }));
    try {
      await d.ChatService(chatId).AddChapter(title, summary);
      closeChapterDraft();
      setStatus("Chapter created.");
    } finally {
      setChapterDraft((draft) => ({ ...draft, isCreating: false }));
    }
  };

  const generateChapterTitle = async () => {
    setChapterDraft((draft) => ({ ...draft, isGeneratingTitle: true }));
    try {
      const title = await d.ChapterGenerationService(chatId).generateChapterTitle();
      if (title) {
        setChapterDraft((draft) => ({ ...draft, title }));
      }
    } finally {
      setChapterDraft((draft) => ({ ...draft, isGeneratingTitle: false }));
    }
  };

  const generateChapterSummary = async () => {
    const title = chapterDraft.title.trim();
    if (!title) return;

    setChapterDraft((draft) => ({ ...draft, isCreating: true }));
    try {
      const summary = await d
        .ChapterGenerationService(chatId)
        .generateChapterSummary();
      if (summary) {
        setChapterDraft((draft) => ({ ...draft, summary }));
      }
    } finally {
      setChapterDraft((draft) => ({ ...draft, isCreating: false }));
    }
  };

  return (
    <Box>
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: FlowStyles.buttonBackground,
          borderRadius: "4px",
        }}
      >
        <Box style={{ flex: 1, minWidth: 0 }}>
          <FlowButton
            onClick={() => undefined}
            onMouseDown={startLongPress}
            onMouseUp={completePress}
            onMouseLeave={() => longPress.cancel()}
            onTouchStart={startLongPress}
            onTouchEnd={completePress}
            leftSection={<LuSparkles size={18} color={Theme.plan.primary} />}
          >
            <Group
              justify="space-between"
              wrap="nowrap"
              style={{ width: "100%", minWidth: 0 }}
            >
              <Box ta="left" style={{ minWidth: 0 }}>
                <Text size="sm" fw={500}>
                  Agent Flow
                </Text>
                <Text size="xs" c="dimmed">
                  {isLoading ? "Analyzing..." : "Suggest next workflow actions"}
                </Text>
              </Box>
              {suggestion && (
                <Badge
                  color={getSignalColor(suggestion)}
                  size="sm"
                  title={`Confidence: ${Math.round(suggestion.confidence * 100)}%`}
                  style={{ flexShrink: 0 }}
                >
                  {getSignalLabel(suggestion)}
                </Badge>
              )}
            </Group>
          </FlowButton>
        </Box>

        <Group gap={2} wrap="nowrap" style={{ flexShrink: 0, marginRight: 4 }}>
          <Tooltip label="Agent Flow settings">
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={onNavigateToSettings}
              aria-label="Agent Flow settings"
            >
              <RiSettings3Line size={16} color="rgba(255, 255, 255, 0.7)" />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Box>

      <AgentIntentPickerModal
        opened={isIntentModalOpen}
        onClose={() => setIsIntentModalOpen(false)}
        onSelect={selectIntent}
      />

      <CreateNoteModal
        opened={noteDraft.opened}
        content={noteDraft.content}
        hasExpiration={noteDraft.hasExpiration}
        expiresAfterMessages={noteDraft.expiresAfterMessages}
        onContentChange={(content) =>
          setNoteDraft((draft) => ({ ...draft, content }))
        }
        onHasExpirationChange={(hasExpiration) =>
          setNoteDraft((draft) => ({ ...draft, hasExpiration }))
        }
        onExpiresAfterMessagesChange={(expiresAfterMessages) =>
          setNoteDraft((draft) => ({ ...draft, expiresAfterMessages }))
        }
        onSubmit={submitNoteDraft}
        onCancel={closeNoteDraft}
      />

      <CreateChapterModal
        opened={chapterDraft.opened}
        title={chapterDraft.title}
        summary={chapterDraft.summary}
        isGeneratingTitle={chapterDraft.isGeneratingTitle}
        isCreating={chapterDraft.isCreating}
        onTitleChange={(title) =>
          setChapterDraft((draft) => ({ ...draft, title }))
        }
        onSummaryChange={(summary) =>
          setChapterDraft((draft) => ({ ...draft, summary }))
        }
        onGenerateTitle={generateChapterTitle}
        onGenerate={generateChapterSummary}
        onSubmit={submitChapterDraft}
        onCancel={closeChapterDraft}
      />

      <AgentClarificationModal
        opened={clarificationDraft.opened}
        question={clarificationDraft.question}
        answer={clarificationDraft.answer}
        options={clarificationDraft.options}
        onAnswerChange={(answer) =>
          setClarificationDraft((draft) => ({ ...draft, answer }))
        }
        onSubmit={submitClarificationDraft}
        onCancel={closeClarificationDraft}
      />

      {(suggestion || status) && (
        <Box
          mt={6}
          p="xs"
          style={{
            border: `1px solid ${FlowStyles.border}`,
            borderRadius: 4,
            backgroundColor: "rgba(255, 255, 255, 0.035)",
          }}
        >
          {suggestion && (
            <Stack gap={6}>
              <Text size="xs" c="dimmed">
                {suggestion.rationale || labelIntent(suggestion.intent)}
              </Text>
              {suggestion.proposedActions.length === 0 ? (
                <Text size="xs" c="dimmed">
                  No workflow action recommended.
                </Text>
              ) : (
                suggestion.proposedActions.map((action, index) => (
                  <Box key={`${action.tool}-${index}`}>
                    <Group justify="space-between" gap="xs" wrap="nowrap">
                      <Box style={{ minWidth: 0, flex: 1 }}>
                        <Text size="xs" fw={600}>
                          {action.title || labelTool(action.tool)}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {action.reason}
                        </Text>
                      </Box>
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="gray"
                        loading={runningActionIndex === index}
                        onClick={() => runAction(action, index)}
                      >
                        {getActionButtonLabel(action)}
                      </Button>
                    </Group>
                  </Box>
                ))
              )}
            </Stack>
          )}
          {status && (
            <Text size="xs" c="dimmed" mt={suggestion ? 6 : 0}>
              {status}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};

interface AgentIntentPickerModalProps {
  opened: boolean;
  onClose: () => void;
  onSelect: (intent: AgentIntent) => void;
}

const INTENT_OPTIONS: Array<{
  intent: AgentIntent;
  title: string;
  description: string;
}> = [
  {
    intent: "update_memory",
    title: "Update Memory",
    description: "Extract durable continuity or character facts.",
  },
  {
    intent: "generate_image",
    title: "Generate Image",
    description: "Prepare an image action for the current scene.",
  },
  {
    intent: "refresh_plan",
    title: "Refresh Plan",
    description: "Update a stale story, plot, or character plan.",
  },
  {
    intent: "create_chapter",
    title: "Create Chapter",
    description: "Compress a natural boundary into a chapter.",
  },
  {
    intent: "add_note",
    title: "Add Note",
    description: "Create short-lived guidance for upcoming turns.",
  },
  {
    intent: "ask_user",
    title: "Ask User",
    description: "Find a missing decision before taking action.",
  },
  {
    intent: "continue_chat",
    title: "Continue Chat",
    description: "Check whether no workflow action is needed.",
  },
];

const AgentIntentPickerModal: React.FC<AgentIntentPickerModalProps> = ({
  opened,
  onClose,
  onSelect,
}) => (
  <Modal opened={opened} onClose={onClose} title="Agent Intent" size="lg">
    <Stack gap="xs">
      {INTENT_OPTIONS.map((option) => (
        <UnstyledButton
          key={option.intent}
          onClick={() => onSelect(option.intent)}
          style={{
            display: "block",
            width: "100%",
            padding: "10px 12px",
            borderRadius: 6,
            border: `1px solid ${FlowStyles.border}`,
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            color: FlowStyles.text,
            textAlign: "left",
          }}
        >
          <Text size="sm" fw={600}>
            {option.title}
          </Text>
          <Text size="xs" c="dimmed">
            {option.description}
          </Text>
        </UnstyledButton>
      ))}
    </Stack>
  </Modal>
);

interface AgentClarificationModalProps {
  opened: boolean;
  question: string;
  answer: string;
  options: string[];
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const AgentClarificationModal: React.FC<AgentClarificationModalProps> = ({
  opened,
  question,
  answer,
  options,
  onAnswerChange,
  onSubmit,
  onCancel,
}) => (
  <Modal opened={opened} onClose={onCancel} title="Clarify Agent Flow" size="lg">
    <Stack>
      <Text size="sm" fw={600}>
        {question}
      </Text>

      {options.length > 0 && (
        <Stack gap="xs">
          {options.map((option) => (
            <UnstyledButton
              key={option}
              onClick={() => onAnswerChange(option)}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 12px",
                borderRadius: 6,
                border:
                  answer === option
                    ? `1px solid ${Theme.plan.primary}`
                    : `1px solid ${FlowStyles.border}`,
                backgroundColor:
                  answer === option
                    ? "rgba(0, 188, 212, 0.15)"
                    : "rgba(255, 255, 255, 0.04)",
                color: FlowStyles.text,
                textAlign: "left",
              }}
            >
              <Text size="sm">{option}</Text>
            </UnstyledButton>
          ))}
        </Stack>
      )}

      <Textarea
        label="Type your own"
        value={answer}
        onChange={(event) => onAnswerChange(event.currentTarget.value)}
        minRows={3}
        autosize
      />

      <Group justify="flex-end">
        <Button variant="default" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!answer.trim()}>
          Save Clarification
        </Button>
      </Group>
    </Stack>
  </Modal>
);

const executeAction = async (
  chatId: string,
  action: AgentFlowAction,
  onNavigateToMemories: () => void,
  onNavigateToPlans: () => void,
  openNoteDraft: (content?: string) => void,
  openChapterDraft: (title?: string, summary?: string) => void,
  openClarificationDraft: (question: string, options?: string[]) => void,
): Promise<string> => {
  switch (action.tool) {
    case "save_memory": {
      const content = getStringArg(action, "content");
      if (!content) {
        onNavigateToMemories();
        return "Opened memories.";
      }
      await d.MemoriesService(chatId).saveMemory({
        id: uuidv4(),
        content,
      });
      return "Memory saved.";
    }
    case "add_note": {
      const content = getStringArg(action, "content");
      if (!content) {
        openNoteDraft();
        return "Opened note editor.";
      }
      await d
        .ChatService(chatId)
        .AddNote(content, getNumberArg(action, "expiresAfterMessages"));
      return "Note added.";
    }
    case "generate_image":
      await d.ImageGenerationService(chatId).generateImage();
      return "Image generation started.";
    case "refresh_plan": {
      const planId =
        getStringArg(action, "planId") ||
        getStringArg(action, "planDefinitionId");
      if (!planId) {
        onNavigateToPlans();
        return "Opened plans.";
      }
      await d.PlanGenerationService(chatId).generatePlanNow(planId);
      return "Plan refresh started.";
    }
    case "create_chapter": {
      const title = getStringArg(action, "title");
      const summary = getStringArg(action, "summary");
      if (!title || !summary) {
        openChapterDraft(title, summary);
        return "Opened chapter editor.";
      }
      await d.ChatService(chatId).AddChapter(title, summary ?? "");
      return "Chapter created.";
    }
    case "ask_user":
      openClarificationDraft(
        getStringArg(action, "question") || action.reason,
        getStringArrayArg(action, "options") ||
          getStringArrayArg(action, "answers") ||
          getStringArrayArg(action, "choices") ||
          [],
      );
      return "Opened clarification prompt.";
  }
};

const getStringArg = (
  action: AgentFlowAction,
  key: string,
): string | undefined => {
  const value = action.args[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const getNumberArg = (
  action: AgentFlowAction,
  key: string,
): number | null => {
  const value = action.args[key];
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const getStringArrayArg = (
  action: AgentFlowAction,
  key: string,
): string[] | undefined => {
  const value = action.args[key];
  if (!Array.isArray(value)) return undefined;

  const options = value.filter(
    (option): option is string =>
      typeof option === "string" && option.trim().length > 0,
  );

  return options.length > 0 ? options : undefined;
};

const labelIntent = (intent: AgentFlowSuggestion["intent"]): string =>
  intent
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

const labelTool = (tool: AgentFlowAction["tool"]): string =>
  tool
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

const getActionButtonLabel = (action: AgentFlowAction): string => {
  if (action.tool === "ask_user") return "Ask";
  if (action.tool === "generate_image") return "Start";
  return "Run";
};

const getSignalLabel = (suggestion: AgentFlowSuggestion): string => {
  if (suggestion.proposedActions.length === 0) return "No action";
  if (suggestion.confidence >= 0.75) return "Suggested";
  if (suggestion.confidence >= 0.45) return "Review";
  return "Partial";
};

const getSignalColor = (suggestion: AgentFlowSuggestion): string => {
  if (suggestion.proposedActions.length === 0) return "gray";
  if (suggestion.confidence >= 0.75) return "green";
  if (suggestion.confidence >= 0.45) return "yellow";
  return "gray";
};
