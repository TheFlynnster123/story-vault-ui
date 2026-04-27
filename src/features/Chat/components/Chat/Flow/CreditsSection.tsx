import React, { useState } from "react";
import { Box, Group, Text, ActionIcon, Loader, Tooltip } from "@mantine/core";
import { RiRefreshLine } from "react-icons/ri";
import { MdAccountBalanceWallet } from "react-icons/md";
import { FlowButton } from "./FlowButton";
import { FlowStyles } from "./FlowStyles";
import { Theme } from "../../../../../components/Theme";
import { useOpenRouterCredits } from "../../../../OpenRouter/hooks/useOpenRouterCredits";

interface CreditsSectionProps {
  chatId: string;
}

const formatBalance = (balance: number): string => {
  return `$${balance.toFixed(2)}`;
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

  const getDisplayText = () => {
    if (isLoading) return "Loading...";
    if (error) return "Error loading balance";
    if (!credits) return "No data";
    return formatBalance(credits.balance);
  };

  const balanceColor = credits ? getBalanceColor(credits.balance) : Theme.credits.primary;

  return (
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
          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
            <Text size="sm" fw={500} style={{ flexShrink: 0 }}>
              Credits
            </Text>
            <Text
              size="sm"
              style={{
                color: balanceColor,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {getDisplayText()}
            </Text>
          </Group>
        </FlowButton>
      </Box>
      <Tooltip label="Refresh balance">
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
  );
};
