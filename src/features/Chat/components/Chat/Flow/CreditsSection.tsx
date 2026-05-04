import React, { useState } from "react";
import { Box, Group, Text, ActionIcon, Loader, Tooltip } from "@mantine/core";
import { RiRefreshLine } from "react-icons/ri";
import { MdAccountBalanceWallet } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { FlowButton } from "./FlowButton";
import { FlowStyles } from "./FlowStyles";
import { Theme } from "../../../../../components/Theme";
import { useOpenRouterCredits } from "../../../../OpenRouter/hooks/useOpenRouterCredits";

interface CreditsSectionProps {
  chatId: string;
}

const formatCurrency = (amount: number): string => `$${amount.toFixed(2)}`;

const getBalanceColor = (balance: number): string => {
  if (balance < 1) return Theme.credits.error;
  if (balance < 5) return Theme.credits.warning;
  return Theme.credits.primary;
};

export const CreditsSection: React.FC<CreditsSectionProps> = ({ chatId }) => {
  const navigate = useNavigate();
  const { credits, isLoading, error, refetch } = useOpenRouterCredits();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const navigateToCredits = () => navigate(`/chat/${chatId}/credits`);

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
            onClick={navigateToCredits}
            leftSection={
              <MdAccountBalanceWallet size={18} color={balanceColor} />
            }
          >
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
              <Text size="sm" fw={500} style={{ flexShrink: 0 }}>
                Credits / Recent Requests
              </Text>
              {availableCredits ? (
                <InlineMetric
                  label="Today"
                  value={formatCurrency(availableCredits.usageDaily)}
                  valueColor={Theme.credits.secondary}
                />
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
