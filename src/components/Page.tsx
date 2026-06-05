import { Container } from "@mantine/core";

interface PageProps {
  children: React.ReactNode;
  padding?: string | number;
  width?: string | number;
  minWidth?: string | number;
  height?: string | number;
  minHeight?: string | number;
}

export const Page: React.FC<PageProps> = ({
  children,
  padding = "md",
  width = "95vw",
  minWidth = "95vw",
  height,
  minHeight,
}) => {
  return (
    <Container miw={minWidth} mih={minHeight} h={height} w={width} p={padding}>
      {children}
    </Container>
  );
};
