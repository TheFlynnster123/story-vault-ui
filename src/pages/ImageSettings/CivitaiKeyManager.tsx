import React, { useState } from "react";
import { useCivitaiKey } from "../../hooks/useCivitaiKey";
import { EncryptionManager } from "../../Managers/EncryptionManager";
import { CivitKeyAPI } from "../../clients/CivitKeyAPI";
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
import { d } from "../../app/Dependencies/Dependencies";

export const CivitaiKeyManager: React.FC = () => {
  const { hasValidCivitaiKey, refreshCivitaiKeyStatus } = useCivitaiKey();

  const [showKeyInput, setShowKeyInput] = useState(false);
  const [civitaiKey, setCivitaiKey] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateKeyClick = () => {
    setShowKeyInput(true);
  };

  const handleCancelUpdate = () => {
    setShowKeyInput(false);
    setCivitaiKey("");
  };

  const handleSaveKey = async () => {
    if (!civitaiKey.trim()) {
      notifications.show({
        title: "Validation Error",
        message: "Please enter a valid Civitai key",
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
        encryptionManager.civitaiEncryptionKey as string,
        civitaiKey
      );

      await new CivitKeyAPI().saveCivitaiKey(encryptedKey);
      await refreshCivitaiKeyStatus();

      notifications.show({
        title: "Success",
        message: "Civitai key updated successfully!",
        color: "green",
        icon: <RiCheckboxCircleLine />,
      });

      setCivitaiKey("");
      setShowKeyInput(false);
    } catch (e) {
      d.ErrorService().log("Failed to save Civitai key", e);
      notifications.show({
        title: "Error",
        message: "Failed to save Civitai key. Please try again.",
        color: "red",
        icon: <RiErrorWarningLine />,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const renderStatus = () => {
    if (hasValidCivitaiKey === undefined) {
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
          hasValidCivitaiKey ? <RiCheckboxCircleLine /> : <RiErrorWarningLine />
        }
        color={hasValidCivitaiKey ? "green" : "red"}
        title={
          hasValidCivitaiKey
            ? "Valid Civitai key configured"
            : "No valid Civitai key found"
        }
      >
        {!showKeyInput && (
          <Button
            onClick={handleUpdateKeyClick}
            size="xs"
            variant="outline"
            mt="sm"
          >
            {hasValidCivitaiKey ? "Update Key" : "Add Key"}
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
            label="Enter your Civitai API key"
            placeholder="Enter Civitai API key..."
            value={civitaiKey}
            onChange={(e) => setCivitaiKey(e.target.value)}
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
              disabled={!civitaiKey.trim()}
            >
              Save Key
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
};
