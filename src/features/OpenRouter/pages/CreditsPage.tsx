import React, { useEffect, useMemo, useState } from "react";
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
  Button,
  NumberInput,
  Select,
  SimpleGrid,
  Switch,
} from "@mantine/core";
import {
  RiArrowLeftLine,
  RiRefreshLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiFileCopyLine,
  RiSettings3Line,
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
import { useSystemSettings } from "../../SystemSettings/hooks/useSystemSettings";
import { d } from "../../../services/Dependencies";
import type {
  TrackedRequest,
  TrackedMessage,
} from "../services/RequestTracker";
import {
  MAX_TRACKED_REQUEST_LIMIT,
  MIN_TRACKED_REQUEST_LIMIT,
  normalizeTrackedRequestLimit,
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

const formatDuration = (ms: number | undefined): string => {
  if (ms === undefined) return "n/a";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const formatRate = (tokens: number | undefined, ms: number | undefined): string => {
  if (!tokens || !ms || ms <= 0) return "n/a";
  return `${(tokens / (ms / 1000)).toFixed(1)}/s`;
};

type RequestStatusFilter = "all" | "success" | "error";
type RequestTypeFilter = "all" | TrackedRequest["type"];
type RequestSort = "newest" | "cost" | "latency" | "tokens" | "errors";

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
  const { systemSettings, saveSystemSettings } = useSystemSettings();
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<RequestTypeFilter>("all");
  const [sortBy, setSortBy] = useState<RequestSort>("newest");
  const monitoringSettings = systemSettings?.openRouterMonitoringSettings;
  const trackedRequestLimit = normalizeTrackedRequestLimit(
    monitoringSettings?.trackedRequestLimit,
  );
  const hideMessageBodiesByDefault =
    monitoringSettings?.hideMessageBodiesByDefault ?? false;

  const visibleRequests = useMemo(
    () => sortRequests(filterRequests(requests, statusFilter, typeFilter), sortBy),
    [requests, statusFilter, typeFilter, sortBy],
  );

  const handleMonitoringChange = async (
    newSettings: NonNullable<
      typeof systemSettings
    >["openRouterMonitoringSettings"],
  ) => {
    const updatedSettings = {
      ...systemSettings,
      openRouterMonitoringSettings: {
        ...monitoringSettings,
        ...newSettings,
      },
    };
    await saveSystemSettings(updatedSettings);
    if (newSettings?.trackedRequestLimit !== undefined) {
      d.RequestTracker().setRequestLimit(newSettings.trackedRequestLimit);
    }
  };

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

          <MonitoringSummary credits={credits} requests={requests} />

          <MonitoringControls
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            sortBy={sortBy}
            trackedRequestLimit={trackedRequestLimit}
            hideMessageBodiesByDefault={hideMessageBodiesByDefault}
            onStatusFilterChange={setStatusFilter}
            onTypeFilterChange={setTypeFilter}
            onSortChange={setSortBy}
            onTrackedRequestLimitChange={(limit) =>
              handleMonitoringChange({ trackedRequestLimit: limit })
            }
            onHideMessageBodiesByDefaultChange={(hide) =>
              handleMonitoringChange({ hideMessageBodiesByDefault: hide })
            }
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

          <RecentRequestsList
            requests={visibleRequests}
            hideMessageBodiesByDefault={hideMessageBodiesByDefault}
          />
        </Stack>
      </Paper>
    </Page>
  );
};

const filterRequests = (
  requests: TrackedRequest[],
  statusFilter: RequestStatusFilter,
  typeFilter: RequestTypeFilter,
): TrackedRequest[] =>
  requests.filter(
    (request) =>
      (statusFilter === "all" || request.status === statusFilter) &&
      (typeFilter === "all" || request.type === typeFilter),
  );

const sortRequests = (
  requests: TrackedRequest[],
  sortBy: RequestSort,
): TrackedRequest[] =>
  [...requests].sort((a, b) => {
    if (sortBy === "cost") return getRequestCost(b) - getRequestCost(a);
    if (sortBy === "latency") return (b.durationMs ?? 0) - (a.durationMs ?? 0);
    if (sortBy === "tokens") return getRequestTokens(b) - getRequestTokens(a);
    if (sortBy === "errors") {
      const byStatus = Number(b.status === "error") - Number(a.status === "error");
      if (byStatus !== 0) return byStatus;
    }
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

const getRequestCost = (request: TrackedRequest): number => {
  if (request.actualCost !== undefined) return request.actualCost;
  return (
    d
      .ModelPricingEstimator()
      .estimateCost(
        request.model,
        request.inputCharCount,
        request.responseCharCount,
      )?.totalCost ?? 0
  );
};

const getRequestTokens = (request: TrackedRequest): number =>
  (request.promptTokens ?? request.inputCharCount / 4) +
  (request.completionTokens ?? request.responseCharCount / 4) +
  (request.reasoningTokens ?? 0);

interface MonitoringSummaryProps {
  credits: ReturnType<typeof useOpenRouterCredits>["credits"];
  requests: TrackedRequest[];
}

const MonitoringSummary: React.FC<MonitoringSummaryProps> = ({
  credits,
  requests,
}) => {
  const summary = useMemo(() => summarizeRequests(requests), [requests]);
  const remainingRequests =
    credits && summary.averageCost > 0
      ? Math.floor(credits.limitRemaining / summary.averageCost)
      : undefined;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
      <SummaryCard
        label="Session Spend"
        value={formatCostDisplay(summary.totalCost, summary.hasEstimatedCost)}
      />
      <SummaryCard
        label="Errors"
        value={`${summary.errorCount}/${summary.requestCount}`}
        valueColor={
          summary.errorCount > 0 ? Theme.credits.error : Theme.credits.primary
        }
      />
      <SummaryCard
        label="Latency"
        value={formatDuration(summary.averageDurationMs)}
        detail="avg request"
      />
      <SummaryCard
        label="Tokens"
        value={formatTokenCount(summary.totalTokens)}
        detail={`${formatTokenCount(summary.promptTokens)} in / ${formatTokenCount(
          summary.completionTokens,
        )} out / ${formatTokenCount(summary.reasoningTokens)} thinking`}
      />
      <SummaryCard
        label="Mix"
        value={`${summary.typeCounts.chat} chat`}
        detail={`${summary.typeCounts["agent-intent"]} agent / ${summary.typeCounts["image-prompt"]} image`}
      />
      <SummaryCard
        label="Top Cost"
        value={
          summary.mostExpensiveRequest
            ? formatCostDisplay(getRequestCost(summary.mostExpensiveRequest), summary.mostExpensiveRequest.actualCost === undefined)
            : "n/a"
        }
        detail={summary.mostExpensiveRequest?.label}
      />
      <SummaryCard
        label="Runway"
        value={
          remainingRequests === undefined ? "n/a" : `~${remainingRequests}`
        }
        detail="avg-cost requests"
      />
    </SimpleGrid>
  );
};

const summarizeRequests = (requests: TrackedRequest[]) => {
  const requestCount = requests.length;
  const errorCount = requests.filter((r) => r.status === "error").length;
  const totalCost = requests.reduce((sum, r) => sum + getRequestCost(r), 0);
  const promptTokens = requests.reduce(
    (sum, r) => sum + (r.promptTokens ?? Math.round(r.inputCharCount / 4)),
    0,
  );
  const completionTokens = requests.reduce(
    (sum, r) =>
      sum + (r.completionTokens ?? Math.round(r.responseCharCount / 4)),
    0,
  );
  const reasoningTokens = requests.reduce(
    (sum, r) => sum + (r.reasoningTokens ?? 0),
    0,
  );
  const successfulDurations = requests
    .map((r) => r.durationMs)
    .filter((ms): ms is number => ms !== undefined);
  const mostExpensiveRequest = requests.reduce<TrackedRequest | undefined>(
    (current, request) =>
      !current || getRequestCost(request) > getRequestCost(current)
        ? request
        : current,
    undefined,
  );

  return {
    requestCount,
    errorCount,
    totalCost,
    promptTokens,
    completionTokens,
    reasoningTokens,
    totalTokens: promptTokens + completionTokens + reasoningTokens,
    mostExpensiveRequest,
    typeCounts: {
      chat: requests.filter((r) => r.type === "chat").length,
      "agent-intent": requests.filter((r) => r.type === "agent-intent").length,
      "image-prompt": requests.filter((r) => r.type === "image-prompt").length,
    },
    hasEstimatedCost: requests.some((r) => r.actualCost === undefined),
    averageCost: requestCount > 0 ? totalCost / requestCount : 0,
    averageDurationMs:
      successfulDurations.length > 0
        ? successfulDurations.reduce((sum, ms) => sum + ms, 0) /
          successfulDurations.length
        : undefined,
  };
};

interface SummaryCardProps {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  detail?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  valueColor = Theme.credits.secondary,
  detail,
}) => (
  <Paper p="sm" style={pageStyles.summaryCard}>
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={700} style={{ color: valueColor, fontSize: "1.15rem" }}>
        {value}
      </Text>
      {detail && (
        <Text size="xs" c="dimmed">
          {detail}
        </Text>
      )}
    </Stack>
  </Paper>
);

interface MonitoringControlsProps {
  statusFilter: RequestStatusFilter;
  typeFilter: RequestTypeFilter;
  sortBy: RequestSort;
  trackedRequestLimit: number;
  hideMessageBodiesByDefault: boolean;
  onStatusFilterChange: (value: RequestStatusFilter) => void;
  onTypeFilterChange: (value: RequestTypeFilter) => void;
  onSortChange: (value: RequestSort) => void;
  onTrackedRequestLimitChange: (value: number) => void;
  onHideMessageBodiesByDefaultChange: (value: boolean) => void;
}

const MonitoringControls: React.FC<MonitoringControlsProps> = ({
  statusFilter,
  typeFilter,
  sortBy,
  trackedRequestLimit,
  hideMessageBodiesByDefault,
  onStatusFilterChange,
  onTypeFilterChange,
  onSortChange,
  onTrackedRequestLimitChange,
  onHideMessageBodiesByDefaultChange,
}) => (
  <Paper p="sm" style={pageStyles.controlsCard}>
    <Group align="end" gap="sm" wrap="wrap">
      <RiSettings3Line size={18} color="rgba(180,180,180,0.8)" />
      <Select
        label="Status"
        size="xs"
        value={statusFilter}
        onChange={(value) => onStatusFilterChange((value ?? "all") as RequestStatusFilter)}
        data={[
          { value: "all", label: "All" },
          { value: "success", label: "Success" },
          { value: "error", label: "Errors" },
        ]}
      />
      <Select
        label="Type"
        size="xs"
        value={typeFilter}
        onChange={(value) => onTypeFilterChange((value ?? "all") as RequestTypeFilter)}
        data={[
          { value: "all", label: "All" },
          { value: "chat", label: "Chat" },
          { value: "agent-intent", label: "Agent Intent" },
          { value: "image-prompt", label: "Image Prompt" },
        ]}
      />
      <Select
        label="Sort"
        size="xs"
        value={sortBy}
        onChange={(value) => onSortChange((value ?? "newest") as RequestSort)}
        data={[
          { value: "newest", label: "Newest" },
          { value: "cost", label: "Cost" },
          { value: "latency", label: "Latency" },
          { value: "tokens", label: "Tokens" },
          { value: "errors", label: "Errors First" },
        ]}
      />
      <NumberInput
        label="Track"
        size="xs"
        value={trackedRequestLimit}
        min={MIN_TRACKED_REQUEST_LIMIT}
        max={MAX_TRACKED_REQUEST_LIMIT}
        clampBehavior="strict"
        suffix=" requests"
        onChange={(value) =>
          onTrackedRequestLimitChange(
            normalizeTrackedRequestLimit(Number(value)),
          )
        }
        style={{ width: 140 }}
      />
      <Switch
        label="Hide bodies by default"
        size="sm"
        checked={hideMessageBodiesByDefault}
        onChange={(event) =>
          onHideMessageBodiesByDefaultChange(event.currentTarget.checked)
        }
      />
    </Group>
  </Paper>
);

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
  hideMessageBodiesByDefault: boolean;
}

const RecentRequestsList: React.FC<RecentRequestsListProps> = ({
  requests,
  hideMessageBodiesByDefault,
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
        <RequestRow
          key={req.id}
          request={req}
          hideMessageBodiesByDefault={hideMessageBodiesByDefault}
        />
      ))}
    </Stack>
  );
};

const RequestRow: React.FC<{
  request: TrackedRequest;
  hideMessageBodiesByDefault: boolean;
}> = ({ request, hideMessageBodiesByDefault }) => {
  const [expanded, setExpanded] = useState(false);
  const [showBodies, setShowBodies] = useState(!hideMessageBodiesByDefault);

  useEffect(() => {
    setShowBodies(!hideMessageBodiesByDefault);
  }, [hideMessageBodiesByDefault]);

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
  const costUsd = request.actualCost ?? estimate?.totalCost;
  const costColor = costUsd !== undefined ? getCostColor(costUsd) : "inherit";
  const isError = request.status === "error";

  return (
    <Paper
      style={{
        ...pageStyles.requestRow,
        borderColor: isError ? "rgba(244, 67, 54, 0.45)" : pageStyles.requestRow.border,
      }}
    >
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
                color={isError ? "red" : getRequestBadgeColor(request)}
                variant="light"
                size="xs"
                style={{ flexShrink: 0 }}
              >
                {isError ? "Error" : request.label}
              </Badge>
              {isError && (
                <Text size="xs" c="red" style={{ whiteSpace: "nowrap" }}>
                  {request.httpStatus ? `HTTP ${request.httpStatus}` : "Request failed"}
                </Text>
              )}
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
              <Text size="xs" c="dimmed">
                {formatDuration(request.durationMs)}
              </Text>
              {request.timeToFirstTokenMs !== undefined && (
                <Text size="xs" c="dimmed">
                  TTFB {formatDuration(request.timeToFirstTokenMs)}
                </Text>
              )}
              {request.completionTokens !== undefined && (
                <Text size="xs" c="dimmed">
                  {formatRate(request.completionTokens, request.durationMs)}
                </Text>
              )}
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
            <Group gap="xs" justify="space-between">
              <Group gap="xs">
                <Button
                  size="compact-xs"
                  variant="subtle"
                  leftSection={<RiFileCopyLine size={13} />}
                  onClick={(event) => {
                    event.stopPropagation();
                    copyDebugBundle(request);
                  }}
                >
                  Copy debug
                </Button>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowBodies((current) => !current);
                  }}
                >
                  {showBodies ? "Hide bodies" : "Show bodies"}
                </Button>
              </Group>
            </Group>
            <RequestSettingsBlock request={request} />
            {isError && request.errorMessage && (
              <ErrorBlock message={request.errorMessage} />
            )}
            {showBodies ? (
              <>
                <MessageList messages={request.inputMessages} />
                <ResponseBlock content={request.responseContent} />
              </>
            ) : (
              <Text size="xs" c="dimmed">
                Message bodies hidden.
              </Text>
            )}
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

const copyDebugBundle = (request: TrackedRequest): void => {
  const bundle = {
    id: request.id,
    status: request.status,
    label: request.label,
    type: request.type,
    model: request.model,
    timestamp: request.timestamp.toISOString(),
    durationMs: request.durationMs,
    timeToFirstTokenMs: request.timeToFirstTokenMs,
    httpStatus: request.httpStatus,
    errorMessage: request.errorMessage,
    usage: {
      cost: request.actualCost,
      promptTokens: request.promptTokens,
      completionTokens: request.completionTokens,
      reasoningTokens: request.reasoningTokens,
    },
    requestSettings: request.requestSettings,
    inputMessages: request.inputMessages,
    responseContent: request.responseContent,
  };

  navigator.clipboard?.writeText(JSON.stringify(bundle, null, 2));
};

const RequestSettingsBlock: React.FC<{ request: TrackedRequest }> = ({
  request,
}) => {
  if (!request.requestSettings || Object.keys(request.requestSettings).length === 0)
    return null;

  return (
    <Stack gap={4}>
      <Text
        size="xs"
        c="dimmed"
        tt="uppercase"
        fw={700}
        style={{ letterSpacing: "0.07em" }}
      >
        Effective Settings
      </Text>
      <Box p="xs" style={pageStyles.debugBlock}>
        <Text
          component="pre"
          size="xs"
          c="dimmed"
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "monospace",
          }}
        >
          {JSON.stringify(request.requestSettings, null, 2)}
        </Text>
      </Box>
    </Stack>
  );
};

const ErrorBlock: React.FC<{ message: string }> = ({ message }) => (
  <Stack gap={4}>
    <Text
      size="xs"
      c="red"
      tt="uppercase"
      fw={700}
      style={{ letterSpacing: "0.07em" }}
    >
      Error
    </Text>
    <Box p="xs" style={{ ...pageStyles.debugBlock, borderLeft: "3px solid rgba(244, 67, 54, 0.8)" }}>
      <Text size="xs" c="red" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {message}
      </Text>
    </Box>
  </Stack>
);

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
  summaryCard: {
    backgroundColor: "rgba(35, 35, 35, 0.72)",
    border: "1px solid rgba(255, 255, 255, 0.07)",
  },
  controlsCard: {
    backgroundColor: "rgba(25, 25, 25, 0.72)",
    border: "1px solid rgba(255, 255, 255, 0.07)",
  },
  requestRow: {
    backgroundColor: "rgba(40, 40, 40, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
  },
  debugBlock: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 4,
    borderLeft: "3px solid rgba(180,180,180,0.45)",
  },
} as const;
