import { Container } from "@mantine/core";

interface PageProps {
  children: React.ReactNode;
  padding?: string | number;
  width?: string | number;
  minWidth?: string | number;
}

export const Page: React.FC<PageProps> = ({
  children,
  padding = "md",
  width = "95vw",
  minWidth = "95vw",
}) => {
  return (
    <Container miw={minWidth} w={width} p={padding}>
      {children}
    </Container>
  );
};
