import { Container } from "@mantine/core";

export const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Container miw={"95vw"} w={"95vw"} p="md">
      {children}
    </Container>
  );
};
