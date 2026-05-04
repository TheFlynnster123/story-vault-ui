import { render as testingLibraryRender } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";

export function render(ui: React.ReactNode) {
  return testingLibraryRender(<>{ui}</>, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <MantineProvider defaultColorScheme="dark">{children}</MantineProvider>
      </MemoryRouter>
    ),
  });
}
