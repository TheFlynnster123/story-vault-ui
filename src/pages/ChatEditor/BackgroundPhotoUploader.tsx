import React from "react";
import {
  Button,
  Group,
  Paper,
  Image,
  FileButton,
  Text,
} from "@mantine/core";

interface BackgroundPhotoUploaderProps {
  backgroundPhotoBase64?: string;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
}

export const BackgroundPhotoUploader: React.FC<BackgroundPhotoUploaderProps> = ({
  backgroundPhotoBase64,
  onPhotoUpload,
  onRemovePhoto,
}) => (
  <div>
    <Text size="sm" fw={500}>
      Background Photo
    </Text>
    {backgroundPhotoBase64 ? (
      <Paper withBorder p="sm" mt="xs">
        <Image
          src={backgroundPhotoBase64}
          alt="Background preview"
          radius="sm"
        />
        <Button
          variant="outline"
          color="red"
          fullWidth
          mt="sm"
          onClick={onRemovePhoto}
        >
          Remove Photo
        </Button>
      </Paper>
    ) : (
      <Group justify="center" mt="xs">
        <FileButton
          onChange={(file) =>
            onPhotoUpload({
              target: { files: file ? [file] : null },
            } as React.ChangeEvent<HTMLInputElement>)
          }
          accept="image/png,image/jpeg,image/gif"
        >
          {(props) => <Button {...props}>Upload Image</Button>}
        </FileButton>
      </Group>
    )}
  </div>
);