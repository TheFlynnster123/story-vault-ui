import React, { useState } from "react";
import { Badge, Box, Button, Group, Stack, Text } from "@mantine/core";
import { LuSparkles } from "react-icons/lu";
import { v4 as uuidv4 } from "uuid";
import { d } from "../../../../../services/Dependencies";
import { Theme } from "../../../../../components/Theme";
import type {
  AgentFlowAction,
  AgentFlowSuggestion,
} from "../../../services/AgentFlow/AgentFlowService";
import { FlowButton } from "./FlowButton";
import { FlowStyles } from "./FlowStyles";

interface AgentFlowSectionProps {
  chatId: string;
  onNavigateToMemories: () => void;
  onNavigateToPlans: () => void;
}

export const AgentFlowSection: React.FC<AgentFlowSectionProps> = ({
  chatId,
  onNavigateToMemories,
  onNavigateToPlans,
}) => {
  const [suggestion, setSuggestion] = useState<AgentFlowSuggestion | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [runningActionIndex, setRunningActionIndex] = useState<number | null>(
    null,
  );
  const [status, setStatus] = useState<string | null>(null);

  const analyzeFlow = async () => {
    setIsLoading(true);
    setStatus(null);
    try {
      const nextSuggestion = await d
        .AgentFlowService(chatId)
        .generateIntentSuggestion();
      setSuggestion(nextSuggestion);
    } catch (error) {
      d.ErrorService().log("Failed to analyze agent flow", error);
      setStatus("Could not analyze flow.");
    } finally {
      setIsLoading(false);
    }
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
      );
      setStatus(result);
    } catch (error) {
      d.ErrorService().log("Failed to run agent action", error);
      setStatus("Action failed.");
    } finally {
      setRunningActionIndex(null);
    }
  };

  return (
    <Box>
      <FlowButton
        onClick={analyzeFlow}
        leftSection={<LuSparkles size={18} color={Theme.plan.primary} />}
      >
        <Group justify="space-between" wrap="nowrap" style={{ width: "100%" }}>
          <Box ta="left">
            <Text size="sm" fw={500}>
              Agent Flow
            </Text>
            <Text size="xs" c="dimmed">
              {isLoading ? "Analyzing..." : "Suggest next workflow actions"}
            </Text>
          </Box>
          {suggestion && (
            <Badge color={getConfidenceColor(suggestion.confidence)} size="sm">
              {Math.round(suggestion.confidence * 100)}%
            </Badge>
          )}
        </Group>
      </FlowButton>

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
                        Run
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

const executeAction = async (
  chatId: string,
  action: AgentFlowAction,
  onNavigateToMemories: () => void,
  onNavigateToPlans: () => void,
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
      if (!content) return "No note content was provided.";
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
      if (!title) return "No chapter title was provided.";
      await d.ChatService(chatId).AddChapter(title, summary ?? "");
      return "Chapter created.";
    }
    case "ask_user":
      return getStringArg(action, "question") || action.reason;
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

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.75) return "green";
  if (confidence >= 0.45) return "yellow";
  return "gray";
};
