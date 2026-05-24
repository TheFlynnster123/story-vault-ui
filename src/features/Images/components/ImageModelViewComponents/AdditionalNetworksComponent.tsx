import React, { useState } from "react";
import {
  Paper,
  Title,
  Stack,
  Group,
  Text,
  Slider,
  ActionIcon,
  TextInput,
  Box,
} from "@mantine/core";
import { RiDeleteBinLine, RiAddLine } from "react-icons/ri";
import type { ImageModel } from "../../services/modelGeneration/ImageModel";

interface AdditionalNetworksComponentProps {
  imageModel: ImageModel;
  onChange: (updatedModel: ImageModel) => void;
}

export const AdditionalNetworksComponent: React.FC<
  AdditionalNetworksComponentProps
> = ({ imageModel, onChange }) => {
  const [newNetworkURN, setNewNetworkURN] = useState("");
  const [newNetworkStrength, setNewNetworkStrength] = useState(0.8);

  const handleAddNetwork = () => {
    if (newNetworkURN.trim()) {
      onChange({
        ...imageModel,
        input: {
          ...imageModel.input,
          loras: {
            ...imageModel.input.loras,
            [newNetworkURN.trim()]: newNetworkStrength,
          },
        },
      });
      setNewNetworkURN("");
      setNewNetworkStrength(0.8);
    }
  };

  const handleRemoveNetwork = (urn: string) => {
    const { [urn]: _, ...rest } = imageModel.input.loras || {};
    onChange({
      ...imageModel,
      input: {
        ...imageModel.input,
        loras: rest,
      },
    });
  };

  const handleUpdateNetworkStrength = (urn: string, strength: number) => {
    onChange({
      ...imageModel,
      input: {
        ...imageModel.input,
        loras: {
          ...imageModel.input.loras,
          [urn]: strength,
        },
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddNetwork();
    }
  };

  const loras = imageModel.input.loras || {};

  return (
    <Paper withBorder p="md" mt="md">
      <Title order={5} mb="sm">
        Additional Networks
      </Title>
      <Stack>
        {Object.entries(loras).map(([urn, strength]) => (
          <Paper withBorder p="sm" radius="sm" key={urn}>
            <Group>
              <Text size="sm" style={{ flex: 1 }}>
                {urn}
              </Text>
              <Slider
                value={strength}
                onChange={(value) => handleUpdateNetworkStrength(urn, value)}
                min={0}
                max={1}
                step={0.1}
                label={(value) => value.toFixed(1)}
                style={{ flex: 2 }}
              />
              <ActionIcon color="red" onClick={() => handleRemoveNetwork(urn)}>
                <RiDeleteBinLine />
              </ActionIcon>
            </Group>
          </Paper>
        ))}
      </Stack>

      <Box mt="md">
        <Group>
          <TextInput
            placeholder="URN"
            value={newNetworkURN}
            onChange={(e) => setNewNetworkURN(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{ flex: 1 }}
          />
          <Slider
            value={newNetworkStrength}
            onChange={setNewNetworkStrength}
            min={0}
            max={1}
            step={0.1}
            label={(value) => value.toFixed(1)}
            style={{ flex: 2 }}
          />
          <ActionIcon color="blue" onClick={handleAddNetwork}>
            <RiAddLine />
          </ActionIcon>
        </Group>
      </Box>
    </Paper>
  );
};
