import React from "react";
import { Image, Loader, Center, Box } from "@mantine/core";
import { useModelPreview } from "../hooks/useModelPreview";

interface ModelPreviewImageProps {
  air: string;
  maxHeight?: string;
  maxWidth?: string;
}

export const ModelPreviewImage: React.FC<ModelPreviewImageProps> = ({
  air,
  maxHeight = "150px",
  maxWidth = "150px",
}) => {
  const { preview, isLoading } = useModelPreview(air);

  if (isLoading) {
    return (
      <Center style={{ height: "60px" }}>
        <Loader size="sm" />
      </Center>
    );
  }

  if (!preview) return null;

  if (preview.type === "video") {
    return (
      <Center>
        <Box style={{ maxWidth, maxHeight, overflow: "hidden" }}>
          <video
            src={preview.url}
            autoPlay
            loop
            muted
            playsInline
            style={{
              maxHeight,
              maxWidth,
              objectFit: "contain",
              borderRadius: "8px",
            }}
          />
        </Box>
      </Center>
    );
  }

  return (
    <Center>
      <Image
        src={preview.url}
        alt="Model preview"
        fit="contain"
        radius="md"
        style={{ maxHeight, maxWidth }}
      />
    </Center>
  );
};
