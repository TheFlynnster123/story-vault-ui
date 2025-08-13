import React, { useState } from "react";
import { useGrokKey } from "../../hooks/useGrokKey";
import { EncryptionManager } from "../../Managers/EncryptionManager";
import { GrokKeyAPI } from "../../clients/GrokKeyAPI";
import {
  PasswordInput,
  Button,
  Group,
  Alert,
  Loader,
  Text,
  Stack,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { RiCheckboxCircleLine, RiErrorWarningLine } from "react-icons/ri";

export const GrokKeyManager: React.FC = () => {
  const { hasValidGrokKey, refreshGrokKeyStatus } = useGrokKey();

  const [showKeyInput, setShowKeyInput] = useState(false);
  const [grokKey, setGrokKey] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateKeyClick = () => {
    setShowKeyInput(true);
  };

  const handleCancelUpdate = () => {
    setShowKeyInput(false);
    setGrokKey("");
  };

  const handleSaveKey = async () => {
    if (!grokKey.trim()) {
      notifications.show({
        title: "Validation Error",
        message: "Please enter a valid Grok key",
        color: "red",
        icon: <RiErrorWarningLine />,
      });
      return;
    }

    setIsUpdating(true);

    try {
      const encryptionManager = new EncryptionManager();
      await encryptionManager.ensureKeysInitialized();

      const encryptedKey = await encryptionManager.encryptString(
        encryptionManager.grokEncryptionKey as string,
        grokKey
      );

      await new GrokKeyAPI().saveGrokKey(encryptedKey);
      await refreshGrokKeyStatus();

      notifications.show({
        title: "Success",
        message: "Grok key updated successfully!",
        color: "green",
        icon: <RiCheckboxCircleLine />,
      });

      setGrokKey("");
      setShowKeyInput(false);
    } catch (error) {
      console.error("Failed to save Grok key:", error);
      notifications.show({
        title: "Error",
        message: "Failed to save Grok key. Please try again.",
        color: "red",
        icon: <RiErrorWarningLine />,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const renderStatus = () => {
    if (hasValidGrokKey === undefined) {
      return (
        <Group>
          <Loader size="sm" />
          <Text>Checking key status...</Text>
        </Group>
      );
    }
    return (
      <Alert
        icon={
          hasValidGrokKey ? <RiCheckboxCircleLine /> : <RiErrorWarningLine />
        }
        color={hasValidGrokKey ? "green" : "red"}
        title={
          hasValidGrokKey
            ? "Valid Grok key configured"
            : "No valid Grok key found"
        }
      >
        {!showKeyInput && (
          <Button
            onClick={handleUpdateKeyClick}
            size="xs"
            variant="outline"
            mt="sm"
          >
            {hasValidGrokKey ? "Update Key" : "Add Key"}
          </Button>
        )}
      </Alert>
    );
  };

  return (
    <Stack>
      {renderStatus()}
      {showKeyInput && (
        <Stack mt="md">
          <PasswordInput
            label="Enter your Grok API key"
            placeholder="Enter Grok API key..."
            value={grokKey}
            onChange={(e) => setGrokKey(e.target.value)}
            disabled={isUpdating}
            autoFocus
          />
          <Group>
            <Button
              variant="default"
              onClick={handleCancelUpdate}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveKey}
              loading={isUpdating}
              disabled={!grokKey.trim()}
            >
              Save Key
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
};
