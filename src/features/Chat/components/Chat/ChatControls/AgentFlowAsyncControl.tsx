import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { LuSparkles } from "react-icons/lu";
import { Theme } from "../../../../../components/Theme";
import { d } from "../../../../../services/Dependencies";
import type {
  AgentFlowAction,
  AgentFlowSuggestion,
} from "../../../services/AgentFlow/AgentFlowService";
import { executeAgentFlowAction } from "../../../services/AgentFlow/AgentFlowActionExecutor";
import { AsyncActionControl } from "./AsyncActionControl";
import { useChapterCreation } from "./ChapterCreationContext";
import { CreateNoteModal } from "./CreateNoteModal";

interface AgentFlowAsyncControlProps {
  chatId: string;
}

export const AgentFlowAsyncControl: React.FC<
  AgentFlowAsyncControlProps
> = ({ chatId }) => {
  const navigate = useNavigate();
  const chapterCreation = useChapterCreation();
  const agentFlowService = d.AgentFlowService(chatId);
  const [suggestion, setSuggestion] = useState<AgentFlowSuggestion | null>(
    agentFlowService.CurrentSuggestion,
  );
  const [opened, setOpened] = useState(false);
  const [runningActionIndex, setRunningActionIndex] = useState<number | null>(
    null,
  );
  const [isDismissing, setIsDismissing] = useState(false);
  const [error, setError] = useState<string>();
  const [noteDraft, setNoteDraft] = useState({
    opened: false,
    content: "",
    hasExpiration: false,
    expiresAfterMessages: 10,
  });
  const [clarificationDraft, setClarificationDraft] = useState({
    opened: false,
    question: "",
    answer: "",
  });

  useEffect(() => {
    const updateSuggestion = () => {
      setSuggestion(agentFlowService.CurrentSuggestion);
      if (!agentFlowService.CurrentSuggestion?.proposedActions.length) {
        setOpened(false);
      }
    };
    const unsubscribe = agentFlowService.subscribe(updateSuggestion);

    void agentFlowService.initialize().catch((loadError) => {
      d.ErrorService().log("Failed to load Agent Flow suggestions", loadError);
    });

    return unsubscribe;
  }, [agentFlowService]);

  const hasPendingSuggestion = Boolean(suggestion?.proposedActions.length);
  const hasSupportingModal = noteDraft.opened || clarificationDraft.opened;

  if (!hasPendingSuggestion && !hasSupportingModal) return null;

  const confirmAction = async (action: AgentFlowAction, index: number) => {
    setRunningActionIndex(index);
    setError(undefined);

    try {
      await executeAgentFlowAction(chatId, action, {
        openMemories: () => navigateFromReview(`/chat/${chatId}/memories`),
        openPlans: () => navigateFromReview(`/chat/${chatId}/plan`),
        openNoteDraft: (content = "") => {
          setOpened(false);
          setNoteDraft({
            opened: true,
            content,
            hasExpiration: false,
            expiresAfterMessages: 10,
          });
        },
        openChapterDraft: (title, summary) => {
          setOpened(false);
          chapterCreation.openEditor(title, summary);
        },
        openClarificationDraft: (question) => {
          setOpened(false);
          setClarificationDraft({
            opened: true,
            question,
            answer: "",
          });
        },
      });
      await agentFlowService.resolveAction(index);
    } catch (actionError) {
      d.ErrorService().log("Failed to confirm Agent Flow suggestion", actionError);
      setError("The workflow suggestion could not be completed.");
    } finally {
      setRunningActionIndex(null);
    }
  };

  const dismissSuggestion = async () => {
    setIsDismissing(true);
    setError(undefined);

    try {
      await agentFlowService.dismissSuggestion();
      setOpened(false);
    } catch (dismissError) {
      d.ErrorService().log(
        "Failed to dismiss Agent Flow suggestions",
        dismissError,
      );
      setError("The workflow suggestion could not be dismissed.");
    } finally {
      setIsDismissing(false);
    }
  };

  const navigateFromReview = (path: string) => {
    setOpened(false);
    navigate(path);
  };

  const submitNote = async () => {
    const content = noteDraft.content.trim();
    if (!content) return;

    await d.ChatService(chatId).AddNote(
      content,
      noteDraft.hasExpiration ? noteDraft.expiresAfterMessages : null,
    );
    setNoteDraft((draft) => ({ ...draft, opened: false }));
  };

  const submitClarification = async () => {
    const answer = clarificationDraft.answer.trim();
    if (!answer) return;

    await d
      .ChatService(chatId)
      .AddAgentClarification(clarificationDraft.question, answer);
    setClarificationDraft((draft) => ({ ...draft, opened: false }));
  };

  return (
    <>
      {suggestion?.proposedActions.length ? (
        <>
          <AsyncActionControl
            label="Review Agent Flow suggestions"
            icon={<LuSparkles size={20} />}
            theme={Theme.plan}
            onClick={() => setOpened(true)}
          />

          <Modal
            opened={opened}
            onClose={() => setOpened(false)}
            title="Review workflow suggestion"
            size="lg"
          >
            <Stack gap="md">
              <Text size="sm">{suggestion.rationale}</Text>

              {suggestion.proposedActions.map((action, index) => (
                <Box
                  key={`${action.tool}-${index}`}
                  p="sm"
                  style={{
                    border: `1px solid ${Theme.plan.border}`,
                    borderRadius: 6,
                  }}
                >
                  <Stack gap="xs">
                    <Text fw={600}>
                      {action.title || labelTool(action.tool)}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {action.reason}
                    </Text>
                    <Button
                      variant="light"
                      loading={runningActionIndex === index}
                      disabled={runningActionIndex !== null || isDismissing}
                      onClick={() => void confirmAction(action, index)}
                      style={{ alignSelf: "flex-start" }}
                    >
                      Confirm
                    </Button>
                  </Stack>
                </Box>
              ))}

              {error && (
                <Text size="sm" c="red">
                  {error}
                </Text>
              )}

              <Group justify="flex-end">
                <Button
                  variant="default"
                  loading={isDismissing}
                  disabled={runningActionIndex !== null}
                  onClick={() => void dismissSuggestion()}
                >
                  Dismiss suggestion
                </Button>
              </Group>
            </Stack>
          </Modal>
        </>
      ) : null}

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
        onSubmit={submitNote}
        onCancel={() =>
          setNoteDraft((draft) => ({ ...draft, opened: false }))
        }
      />

      <Modal
        opened={clarificationDraft.opened}
        onClose={() =>
          setClarificationDraft((draft) => ({ ...draft, opened: false }))
        }
        title="Clarify workflow"
      >
        <Stack gap="md">
          <Text size="sm">{clarificationDraft.question}</Text>
          <Textarea
            label="Your answer"
            value={clarificationDraft.answer}
            onChange={(event) =>
              setClarificationDraft((draft) => ({
                ...draft,
                answer: event.currentTarget.value,
              }))
            }
            minRows={3}
            autosize
          />
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() =>
                setClarificationDraft((draft) => ({
                  ...draft,
                  opened: false,
                }))
              }
            >
              Cancel
            </Button>
            <Button
              disabled={!clarificationDraft.answer.trim()}
              onClick={() => void submitClarification()}
            >
              Save clarification
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

const labelTool = (tool: AgentFlowAction["tool"]): string =>
  tool
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
