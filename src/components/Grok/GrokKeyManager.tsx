import React, { useState } from "react";
import { useGrokKey } from "./useGrokKey";
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
import { d } from "../../services/Dependencies";

export const GrokKeyManager: React.FC = () => {
  const { hasValidGrokKey, refreshGrokKeyStatus } = useGrokKey();

  const [showKeyInput, setShowKeyInput] = useState(false);
  const [grokKey, setGrokKey] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

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
      const encryptedKey = await d
        .EncryptionManager()
        .encryptString("grok", grokKey);

      await d.GrokKeyAPI().saveGrokKey(encryptedKey);
      await refreshGrokKeyStatus();

      notifications.show({
        title: "Success",
        message: "Grok key updated successfully!",
        color: "green",
        icon: <RiCheckboxCircleLine />,
      });

      setGrokKey("");
      setShowKeyInput(false);
    } catch (e) {
      d.ErrorService().log("Failed to save Grok key", e);
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

  return (
    <Stack w={"100%"}>
      <KeyStatus
        hasValidGrokKey={hasValidGrokKey}
        showKeyInput={showKeyInput}
        onUpdateClick={() => setShowKeyInput(true)}
      />
      {showKeyInput && (
        <Stack mb="sm">
          <TextInput
            label="Enter your Grok API key"
            placeholder="Enter Grok API key..."
            value={grokKey}
            onChange={(e) => setGrokKey(e.target.value)}
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

interface IKeyStatus {
  hasValidGrokKey: boolean | undefined;
  showKeyInput: boolean;
  onUpdateClick: () => void;
}

const KeyStatus = ({
  hasValidGrokKey,
  showKeyInput,
  onUpdateClick,
}: IKeyStatus) => {
  if (hasValidGrokKey === undefined) {
    return (
      <Group>
        <Loader size="sm" />
        <Text>Checking key status...</Text>
      </Group>
    );
  }

  const isValid = hasValidGrokKey;

  return (
    <Stack gap="sm" align="center">
      <Alert
        w="100%"
        icon={isValid ? <RiCheckboxCircleLine /> : <RiErrorWarningLine />}
        color={isValid ? "green" : "red"}
        title={
          <Text ta="center">
            {isValid ? "Valid Grok key configured" : "No valid Grok key found"}
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
