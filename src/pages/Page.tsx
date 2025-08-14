import { Container } from "@mantine/core";

export const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Container
      style={{ overflowY: "auto", maxHeight: "100%" }}
      miw="70vw"
      maw={"70vw"}
    >
      {children}
    </Container>
  );
};
