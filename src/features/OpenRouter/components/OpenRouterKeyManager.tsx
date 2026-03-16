import React, { useState } from "react";
import { useOpenRouterKey } from "../hooks/useOpenRouterKey";
import {
  TextInput,
  Button,
  Group,
  Alert,
  Loader,
  Text,
  Stack,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { RiCheckboxCircleLine, RiErrorWarningLine } from "react-icons/ri";
import { d } from "../../../services/Dependencies";

export const OpenRouterKeyManager: React.FC = () => {
  const { hasValidOpenRouterKey, refreshOpenRouterKeyStatus } =
    useOpenRouterKey();

  const [showKeyInput, setShowKeyInput] = useState(false);
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCancelUpdate = () => {
    setShowKeyInput(false);
    setOpenRouterKey("");
  };

  const handleSaveKey = async () => {
    if (!openRouterKey.trim()) {
      notifications.show({
        title: "Validation Error",
        message: "Please enter a valid OpenRouter key",
        color: "red",
        icon: <RiErrorWarningLine />,
      });
      return;
    }

    setIsUpdating(true);

    try {
      const encryptedKey = await d
        .EncryptionManager()
        .encryptString("openrouter", openRouterKey);

      await d.OpenRouterKeyAPI().saveOpenRouterKey(encryptedKey);
      await refreshOpenRouterKeyStatus();

      notifications.show({
        title: "Success",
        message: "OpenRouter key updated successfully!",
        color: "green",
        icon: <RiCheckboxCircleLine />,
      });

      setOpenRouterKey("");
      setShowKeyInput(false);
    } catch (e) {
      d.ErrorService().log("Failed to save OpenRouter key", e);
      notifications.show({
        title: "Error",
        message: "Failed to save OpenRouter key. Please try again.",
        color: "red",
        icon: <RiErrorWarningLine />,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Stack w={"100%"}>
      <KeyStatus
        hasValidOpenRouterKey={hasValidOpenRouterKey}
        showKeyInput={showKeyInput}
        onUpdateClick={() => setShowKeyInput(true)}
      />
      {showKeyInput && (
        <Stack mb="sm">
          <TextInput
            label="Enter your OpenRouter API key"
            placeholder="Enter OpenRouter API key..."
            value={openRouterKey}
            onChange={(e) => setOpenRouterKey(e.target.value)}
            disabled={isUpdating}
          />
          <Group justify="center">
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
              disabled={!openRouterKey.trim()}
            >
              Save Key
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
};

interface IKeyStatus {
  hasValidOpenRouterKey: boolean | undefined;
  showKeyInput: boolean;
  onUpdateClick: () => void;
}

const KeyStatus = ({
  hasValidOpenRouterKey,
  showKeyInput,
  onUpdateClick,
}: IKeyStatus) => {
  if (hasValidOpenRouterKey === undefined) {
    return (
      <Group>
        <Loader size="sm" />
        <Text>Checking key status...</Text>
      </Group>
    );
  }

  const isValid = hasValidOpenRouterKey;

  return (
    <Stack gap="sm" align="center">
      <Alert
        w="100%"
        icon={isValid ? <RiCheckboxCircleLine /> : <RiErrorWarningLine />}
        color={isValid ? "green" : "red"}
        title={
          <Text ta="center">
            {isValid
              ? "Valid OpenRouter key configured"
              : "No valid OpenRouter key found"}
          </Text>
        }
      />
      {!showKeyInput && (
        <Button onClick={onUpdateClick} size="sm" variant="outline">
          {isValid ? "Update Key" : "Add Key"}
        </Button>
      )}
    </Stack>
  );
};
