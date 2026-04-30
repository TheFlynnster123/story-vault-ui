import React, { useState } from "react";
import {
  Box,
  Group,
  Text,
  Paper,
  ActionIcon,
  Loader,
  Tooltip,
} from "@mantine/core";
import { RiRefreshLine } from "react-icons/ri";
import { MdAccountBalanceWallet } from "react-icons/md";
import { FlowButton } from "./FlowButton";
import { FlowStyles } from "./FlowStyles";
import { Theme } from "../../../../../components/Theme";
import { useOpenRouterCredits } from "../../../../OpenRouter/hooks/useOpenRouterCredits";

interface CreditsSectionProps {
  chatId: string;
}

const formatCurrency = (amount: number): string => `$${amount.toFixed(2)}`;

const formatLimitReset = (limitReset: string | null): string => {
  if (!limitReset) return "never";
  return limitReset.toLowerCase();
};

const getBalanceColor = (balance: number): string => {
  if (balance < 1) return Theme.credits.error;
  if (balance < 5) return Theme.credits.warning;
  return Theme.credits.primary;
};

export const CreditsSection: React.FC<CreditsSectionProps> = () => {
  const { credits, isLoading, error, refetch } = useOpenRouterCredits();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const hasCredits = Boolean(credits && !isLoading && !error);
  const availableCredits = hasCredits ? credits : undefined;

  const getStatusText = () => {
    if (isLoading) return "Loading...";
    if (error) return "Error loading balance";
    return "No data";
  };

  const balanceColor = credits
    ? getBalanceColor(credits.limitRemaining)
    : Theme.credits.primary;

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
            onClick={() => {
              // Future: could open a modal with more details
            }}
            leftSection={
              <MdAccountBalanceWallet size={18} color={balanceColor} />
            }
          >
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
              <Text size="sm" fw={500} style={{ flexShrink: 0 }}>
                Credits
              </Text>
              {availableCredits ? (
                <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                  <InlineMetric
                    label="Spend Today"
                    value={formatCurrency(availableCredits.usageDaily)}
                    valueColor={Theme.credits.secondary}
                  />
                  <InlineMetric
                    label="Limit"
                    value={formatCurrency(availableCredits.limitRemaining)}
                    valueColor={balanceColor}
                  />
                </Group>
              ) : (
                <Text
                  size="xs"
                  c="dimmed"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {getStatusText()}
                </Text>
              )}
            </Group>
          </FlowButton>
        </Box>
        <Tooltip label="Refresh credits">
          <ActionIcon
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            variant="subtle"
            color="gray"
            style={{
              flexShrink: 0,
              marginRight: "4px",
            }}
          >
            {isRefreshing ? (
              <Loader size="xs" color="gray" />
            ) : (
              <RiRefreshLine size={18} color="rgba(255, 255, 255, 0.7)" />
            )}
          </ActionIcon>
        </Tooltip>
      </Box>
      {availableCredits && (
        <Box mt="xs">
          <Paper
            p="xs"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              borderRadius: "4px",
            }}
          >
            <CreditsDetailLine>
              <LabeledValue
                label="Resets"
                value={formatLimitReset(availableCredits.limitReset)}
                valueColor={Theme.credits.secondary}
              />
            </CreditsDetailLine>
            <CreditsDetailLine>
              <LabeledValue
                label="Spent this Week"
                value={formatCurrency(availableCredits.usageWeekly)}
              />
              <Text span size="xs" c="dimmed">
                {" · "}
              </Text>
              <LabeledValue
                label="Month"
                value={formatCurrency(availableCredits.usageMonthly)}
              />
            </CreditsDetailLine>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

interface InlineMetricProps {
  label: string;
  value: string;
  valueColor: string;
}

const InlineMetric: React.FC<InlineMetricProps> = ({
  label,
  value,
  valueColor,
}) => (
  <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
    <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
      {label}:
    </Text>
    <Text
      size="xs"
      fw={600}
      style={{
        color: valueColor,
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </Text>
  </Group>
);

interface LabeledValueProps {
  label: string;
  value: string;
  valueColor?: string;
}

const LabeledValue: React.FC<LabeledValueProps> = ({
  label,
  value,
  valueColor = Theme.credits.primary,
}) => (
  <>
    <Text span size="xs" fw={600} c="dimmed">
      {label}:
    </Text>
    <Text span size="xs" c="dimmed">
      {" "}
    </Text>
    <Text span size="xs" fw={500} style={{ color: valueColor }}>
      {value}
    </Text>
  </>
);

const CreditsDetailLine: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Box
    mb="xs"
    pl="sm"
    style={{
      borderLeft: "2px solid rgba(255, 255, 255, 0.3)",
    }}
  >
    <Text size="xs" c="dimmed">
      {children}
    </Text>
  </Box>
);
