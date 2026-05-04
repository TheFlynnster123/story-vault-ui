import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Title,
  Group,
  Paper,
  Stack,
  Text,
  Badge,
  ActionIcon,
  Loader,
  Divider,
  Tooltip,
  Box,
} from "@mantine/core";
import {
  RiArrowLeftLine,
  RiRefreshLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
} from "react-icons/ri";
import {
  MdAccountBalanceWallet,
  MdOutlineChat,
  MdOutlineImage,
  MdOutlineSmartToy,
} from "react-icons/md";
import { Page } from "../../../components/Page";
import { Theme } from "../../../components/Theme";
import { useOpenRouterCredits } from "../hooks/useOpenRouterCredits";
import { useRequestTracker } from "../hooks/useRequestTracker";
import { d } from "../../../services/Dependencies";
import type {
  TrackedRequest,
  TrackedMessage,
} from "../services/RequestTracker";

const formatCurrencyShort = (amount: number): string => `$${amount.toFixed(2)}`;

const formatLimitReset = (limitReset: string | null): string => {
  if (!limitReset) return "Never";
  return limitReset.charAt(0).toUpperCase() + limitReset.slice(1).toLowerCase();
};

const getBalanceColor = (balance: number): string => {
  if (balance < 1) return Theme.credits.error;
  if (balance < 5) return Theme.credits.warning;
  return Theme.credits.primary;
};

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const formatCharCount = (chars: number): string => {
  if (chars < 1000) return `${chars}`;
  return `${(chars / 1000).toFixed(1)}k`;
};

const formatTokenEstimate = (chars: number): string => {
  const tokens = chars / 4;
  if (tokens < 1000) return `~${Math.round(tokens)}`;
  return `~${(tokens / 1000).toFixed(1)}k`;
};

const formatTokenCount = (n: number): string => {
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(1)}k`;
};

const lerpChannel = (a: number, b: number, t: number) =>
  Math.round(a + (b - a) * Math.min(1, Math.max(0, t)));

const getCostColor = (usd: number): string => {
  // Log scale: t=0 at ≤$0.00001, t=1 at ≥$1.00
  const t = Math.min(1, Math.max(0, (Math.log10(Math.max(usd, 1e-5)) + 5) / 5));
  const stops: [number, number, number, number, number][] = [
    [0.0, 175, 155, 100, 0.6], // $0.00001 — muted grey-yellow
    [0.4, 240, 210, 40, 0.9], // ~$0.001  — yellow
    [0.7, 255, 130, 20, 0.95], // ~$0.10   — orange
    [1.0, 215, 50, 35, 1.0], // $1.00+   — red
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, r0, g0, b0, a0] = stops[i];
    const [t1, r1, g1, b1, a1] = stops[i + 1];
    if (t <= t1) {
      const s = (t - t0) / (t1 - t0);
      const a = a0 + (a1 - a0) * s;
      return `rgba(${lerpChannel(r0, r1, s)},${lerpChannel(g0, g1, s)},${lerpChannel(b0, b1, s)},${a.toFixed(2)})`;
    }
  }
  return "rgba(215,50,35,1.00)";
};

const formatCostDisplay = (
  usd: number,
  isEstimate: boolean,
): React.ReactNode => {
  const prefix = isEstimate ? "~" : "";
  const mainPart = usd.toFixed(2);
  const full = usd.toFixed(8);
  const dotIndex = full.indexOf(".");
  const subCents = full.slice(dotIndex + 3).replace(/0+$/, ""); // digits 3–8, trailing zeros trimmed
  return (
    <>
      {prefix}${mainPart}
      {subCents.length > 0 && (
        <span style={{ fontSize: "0.72em", opacity: 0.45 }}>{subCents}</span>
      )}
    </>
  );
};

const getRequestIcon = (request: TrackedRequest): React.ReactNode => {
  if (request.type === "image-prompt")
    return <MdOutlineImage size={14} color={Theme.imageModel.primary} />;
  if (request.label === "Chat")
    return <MdOutlineChat size={14} color={Theme.credits.primary} />;
  return <MdOutlineSmartToy size={14} color="rgba(180,180,180,0.8)" />;
};

const getRequestBadgeColor = (request: TrackedRequest): string => {
  if (request.type === "image-prompt") return "lime";
  if (request.label === "Chat") return "yellow";
  return "gray";
};

export const CreditsPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { credits, isLoading, error, refetch } = useOpenRouterCredits();
  const requests = useRequestTracker();

  const handleBack = () => navigate(`/chat/${chatId}`);

  const balanceColor = credits
    ? getBalanceColor(credits.limitRemaining)
    : Theme.credits.primary;

  return (
    <Page>
      <Paper mt={20} p="xl" style={pageStyles.paper}>
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={handleBack}
                aria-label="Back to chat"
              >
                <RiArrowLeftLine size={20} />
              </ActionIcon>
              <Group gap="xs">
                <MdAccountBalanceWallet
                  size={22}
                  color={Theme.credits.primary}
                />
                <Title order={3} style={{ color: Theme.page.text }}>
                  Credits / Recent Requests
                </Title>
              </Group>
            </Group>
            <Tooltip label="Refresh credits">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => refetch()}
                disabled={isLoading}
                aria-label="Refresh credits"
              >
                {isLoading ? (
                  <Loader size="xs" color="gray" />
                ) : (
                  <RiRefreshLine size={18} />
                )}
              </ActionIcon>
            </Tooltip>
          </Group>

          <CreditsPanel
            credits={credits}
            isLoading={isLoading}
            error={error}
            balanceColor={balanceColor}
          />

          <Divider
            label={
              <Text size="sm" fw={600} c="dimmed">
                Recent Requests
              </Text>
            }
            labelPosition="left"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
          />

          <RecentRequestsList requests={requests} />
        </Stack>
      </Paper>
    </Page>
  );
};

interface CreditsPanelProps {
  credits: ReturnType<typeof useOpenRouterCredits>["credits"];
  isLoading: boolean;
  error: Error | null;
  balanceColor: string;
}

const CreditsPanel: React.FC<CreditsPanelProps> = ({
  credits,
  isLoading,
  error,
  balanceColor,
}) => {
  if (isLoading)
    return (
      <Group justify="center" p="md">
        <Loader size="sm" color="yellow" />
        <Text size="sm" c="dimmed">
          Loading credits…
        </Text>
      </Group>
    );

  if (error)
    return (
      <Paper p="md" style={pageStyles.errorCard}>
        <Text size="sm" c="red">
          {error.message}
        </Text>
      </Paper>
    );

  if (!credits)
    return (
      <Text size="sm" c="dimmed">
        No credits data available.
      </Text>
    );

  return (
    <Stack gap="md">
      {credits.label && (
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
          {credits.label}
        </Text>
      )}

      <Group gap="md" align="flex-start" wrap="wrap">
        {/* Current Usage */}
        <Paper
          p="md"
          style={{ ...pageStyles.creditsCard, flex: 1, minWidth: 220 }}
        >
          <Stack gap="sm">
            <Text
              size="xs"
              c="dimmed"
              tt="uppercase"
              fw={700}
              style={{ letterSpacing: "0.08em" }}
            >
              Current Usage
            </Text>
            <Group gap="xl" wrap="wrap">
              <MetricBlock
                label="Today"
                value={formatDailyCurrency(credits.usageDaily)}
                valueColor={Theme.credits.secondary}
                large
              />
              <MetricBlock
                label="This Week"
                value={formatCurrencyShort(credits.usageWeekly)}
                valueColor={Theme.credits.secondary}
              />
              <MetricBlock
                label="This Month"
                value={formatCurrencyShort(credits.usageMonthly)}
                valueColor={Theme.credits.secondary}
              />
              <MetricBlock
                label="All Time"
                value={formatCurrencyShort(credits.usage)}
                valueColor="rgba(180,180,180,0.8)"
              />
            </Group>
          </Stack>
        </Paper>

        {/* Limits */}
        <Paper
          p="md"
          style={{ ...pageStyles.limitsCard, flex: 1, minWidth: 220 }}
        >
          <Stack gap="sm">
            <Text
              size="xs"
              c="dimmed"
              tt="uppercase"
              fw={700}
              style={{ letterSpacing: "0.08em" }}
            >
              Limits
            </Text>
            <Group gap="xl" wrap="wrap">
              <MetricBlock
                label="Remaining"
                value={formatCurrencyShort(credits.limitRemaining)}
                valueColor={balanceColor}
                large
              />
              {credits.limit !== null && (
                <MetricBlock
                  label="Limit"
                  value={formatCurrencyShort(credits.limit!)}
                  valueColor="rgba(180,180,180,0.8)"
                />
              )}
              {credits.limitReset && (
                <MetricBlock
                  label="Resets"
                  value={formatLimitReset(credits.limitReset)}
                  valueColor="rgba(180,180,180,0.8)"
                />
              )}
              {credits.isFreeTier && (
                <Stack gap={2}>
                  <Text
                    size="xs"
                    c="dimmed"
                    tt="uppercase"
                    fw={600}
                    style={{ letterSpacing: "0.05em" }}
                  >
                    Tier
                  </Text>
                  <Badge color="blue" variant="light" size="sm">
                    Free
                  </Badge>
                </Stack>
              )}
            </Group>
          </Stack>
        </Paper>
      </Group>
    </Stack>
  );
};

const formatDailyCurrency = (usd: number): React.ReactNode => {
  const mainPart = usd.toFixed(2);
  const subCents = usd
    .toFixed(8)
    .slice(3 + 2)
    .replace(/0+$/, ""); // digits after 2nd decimal, trailing zeros trimmed
  return (
    <>
      ${mainPart}
      {subCents.length > 0 && (
        <span style={{ fontSize: "0.6em", opacity: 0.5 }}>{subCents}</span>
      )}
    </>
  );
};

interface MetricBlockProps {
  label: string;
  value: React.ReactNode;
  valueColor: string;
  large?: boolean;
}

const MetricBlock: React.FC<MetricBlockProps> = ({
  label,
  value,
  valueColor,
  large,
}) => (
  <Stack gap={2}>
    <Text
      size="xs"
      c="dimmed"
      tt="uppercase"
      fw={600}
      style={{ letterSpacing: "0.05em" }}
    >
      {label}
    </Text>
    <Text
      fw={700}
      style={{ color: valueColor, fontSize: large ? "1.5rem" : "1rem" }}
    >
      {value}
    </Text>
  </Stack>
);

interface RecentRequestsListProps {
  requests: TrackedRequest[];
}

const RecentRequestsList: React.FC<RecentRequestsListProps> = ({
  requests,
}) => {
  if (requests.length === 0)
    return (
      <Text size="sm" c="dimmed" ta="center" py="xl">
        No requests yet this session. Generate a chat response or image prompt
        to see usage here.
      </Text>
    );

  return (
    <Stack gap="xs">
      {requests.map((req) => (
        <RequestRow key={req.id} request={req} />
      ))}
    </Stack>
  );
};

const RequestRow: React.FC<{ request: TrackedRequest }> = ({ request }) => {
  const [expanded, setExpanded] = useState(false);

  // Prefer real token/cost data from the API; fall back to char-based estimates.
  const hasActualTokens =
    request.promptTokens !== undefined &&
    request.completionTokens !== undefined;
  const estimate = hasActualTokens
    ? null
    : d
        .ModelPricingEstimator()
        .estimateCost(
          request.model,
          request.inputCharCount,
          request.responseCharCount,
        );

  const inputTokenLabel = hasActualTokens
    ? `${formatTokenCount(request.promptTokens!)} tokens in`
    : `${formatTokenEstimate(request.inputCharCount)} tokens in (${formatCharCount(request.inputCharCount)} chars)`;

  const outputTokenLabel = (() => {
    if (!hasActualTokens)
      return `${formatTokenEstimate(request.responseCharCount)} tokens out (${formatCharCount(request.responseCharCount)} chars)`;
    const base = `${formatTokenCount(request.completionTokens!)} tokens out`;
    return request.reasoningTokens
      ? `${base} (+${formatTokenCount(request.reasoningTokens)} reasoning)`
      : base;
  })();

  const costNode = (() => {
    if (request.actualCost !== undefined)
      return formatCostDisplay(request.actualCost, false);
    if (estimate) return formatCostDisplay(estimate.totalCost, true);
    return null;
  })();

  const costIsExact = request.actualCost !== undefined;
  const costUsd =
    request.actualCost !== undefined ? request.actualCost : estimate?.totalCost;
  const costColor = costUsd !== undefined ? getCostColor(costUsd) : "inherit";

  return (
    <Paper style={pageStyles.requestRow}>
      <Group
        justify="space-between"
        wrap="nowrap"
        gap="md"
        p="sm"
        style={{ cursor: "pointer" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <Box style={{ flexShrink: 0 }}>{getRequestIcon(request)}</Box>
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Group gap="xs" wrap="nowrap">
              <Badge
                color={getRequestBadgeColor(request)}
                variant="light"
                size="xs"
                style={{ flexShrink: 0 }}
              >
                {request.label}
              </Badge>
              {request.model && (
                <Text
                  size="xs"
                  c="dimmed"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {request.model}
                </Text>
              )}
            </Group>
            <Group gap="md">
              <Text size="xs" c="dimmed">
                {request.inputMessageCount} msg
              </Text>
              <Text size="xs" c="dimmed">
                {inputTokenLabel}
              </Text>
              <Text size="xs" c="dimmed">
                {outputTokenLabel}
              </Text>
              {costNode && (
                <Tooltip
                  label={
                    costIsExact
                      ? "Exact cost from OpenRouter"
                      : "Estimated (model pricing \u00d7 char count)"
                  }
                  withArrow
                  position="top"
                >
                  <Text
                    size="xs"
                    style={{
                      color: costColor,
                    }}
                  >
                    {costNode}
                  </Text>
                </Tooltip>
              )}
            </Group>
          </Stack>
        </Group>
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
            {formatTimeAgo(request.timestamp)}
          </Text>
          {expanded ? (
            <RiArrowUpSLine size={16} color="rgba(255,255,255,0.4)" />
          ) : (
            <RiArrowDownSLine size={16} color="rgba(255,255,255,0.4)" />
          )}
        </Group>
      </Group>

      {expanded && (
        <Box
          px="sm"
          pb="sm"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Stack gap="sm" pt="sm">
            <MessageList messages={request.inputMessages} />
            <ResponseBlock content={request.responseContent} />
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

const roleLabelColor = (role: string): string => {
  if (role === "user") return Theme.messages.user.background;
  if (role === "assistant") return Theme.messages.assistant.background;
  return "rgba(180,180,180,0.8)";
};

const MessageList: React.FC<{ messages: TrackedMessage[] }> = ({
  messages,
}) => (
  <Stack gap={4}>
    <Text
      size="xs"
      c="dimmed"
      tt="uppercase"
      fw={700}
      style={{ letterSpacing: "0.07em" }}
    >
      Input Messages
    </Text>
    {messages.map((msg, i) => (
      <Box
        key={i}
        p="xs"
        style={{
          backgroundColor: "rgba(0,0,0,0.3)",
          borderRadius: 4,
          borderLeft: `3px solid ${roleLabelColor(msg.role)}`,
        }}
      >
        <Text
          size="xs"
          fw={700}
          style={{ color: roleLabelColor(msg.role), marginBottom: 2 }}
        >
          {msg.role}
        </Text>
        <Text
          size="xs"
          c="dimmed"
          style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        >
          {msg.content}
        </Text>
      </Box>
    ))}
  </Stack>
);

const ResponseBlock: React.FC<{ content: string }> = ({ content }) => (
  <Stack gap={4}>
    <Text
      size="xs"
      c="dimmed"
      tt="uppercase"
      fw={700}
      style={{ letterSpacing: "0.07em" }}
    >
      Response
    </Text>
    <Box
      p="xs"
      style={{
        backgroundColor: "rgba(0,0,0,0.3)",
        borderRadius: 4,
        borderLeft: `3px solid ${Theme.credits.primary}`,
      }}
    >
      <Text
        size="xs"
        c="dimmed"
        style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      >
        {content}
      </Text>
    </Box>
  </Stack>
);

const pageStyles = {
  paper: {
    backgroundColor: "rgba(20, 20, 20, 0.95)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  creditsCard: {
    backgroundColor: "rgba(255, 215, 0, 0.06)",
    border: `1px solid ${Theme.credits.border}`,
  },
  limitsCard: {
    backgroundColor: "rgba(99, 102, 241, 0.06)",
    border: "1px solid rgba(99, 102, 241, 0.3)",
  },
  errorCard: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    border: "1px solid rgba(244, 67, 54, 0.3)",
  },
  requestRow: {
    backgroundColor: "rgba(40, 40, 40, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
  },
} as const;
