import React, { useState } from "react";
import { useCivitaiKey } from "../Images/hooks/useCivitaiKey";
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

export const CivitaiKeyManager: React.FC = () => {
  const { hasValidCivitaiKey, refreshCivitaiKeyStatus } = useCivitaiKey();

  const [showKeyInput, setShowKeyInput] = useState(false);
  const [civitaiKey, setCivitaiKey] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

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
      const encryptedKey = await d
        .EncryptionManager()
        .encryptString("civitai", civitaiKey);

      await d.CivitKeyAPI().saveCivitaiKey(encryptedKey);
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

  return (
    <Stack w={"100%"}>
      <KeyStatus
        hasValidCivitaiKey={hasValidCivitaiKey}
        showKeyInput={showKeyInput}
        onUpdateClick={() => setShowKeyInput(true)}
      />
      {showKeyInput && (
        <Stack mb="sm">
          <TextInput
            width={""}
            label="Enter your Civitai API key"
            placeholder="Enter Civitai API key..."
            value={civitaiKey}
            onChange={(e) => setCivitaiKey(e.target.value)}
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

interface IKeyStatus {
  hasValidCivitaiKey: boolean | undefined;
  showKeyInput: boolean;
  onUpdateClick: () => void;
}

const KeyStatus = ({
  hasValidCivitaiKey,
  showKeyInput,
  onUpdateClick,
}: IKeyStatus) => {
  if (hasValidCivitaiKey === undefined) {
    return (
      <Group w="100%">
        <Loader size="sm" />
        <Text>Checking key status...</Text>
      </Group>
    );
  }

  const isValid = hasValidCivitaiKey;

  return (
    <Stack gap="sm" align="center" mb="md">
      <Alert
        w="100%"
        icon={isValid ? <RiCheckboxCircleLine /> : <RiErrorWarningLine />}
        color={isValid ? "green" : "red"}
        title={
          <Text>
            {isValid
              ? "Valid Civitai key configured"
              : "No valid Civitai key found"}
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
