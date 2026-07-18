import { expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "../../../../../testing";
import { Theme } from "../../../../../components/Theme";
import { AsyncActionControl } from "./AsyncActionControl";

it("renders an accessible themed approval control with an attention indicator", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  const { container } = render(
    <AsyncActionControl
      label="Review chapter draft"
      icon={<span>chapter</span>}
      theme={Theme.chapter}
      onClick={onClick}
    />,
  );

  await user.click(
    screen.getByRole("button", { name: "Review chapter draft" }),
  );

  expect(onClick).toHaveBeenCalledOnce();
  expect(
    container.querySelector(".mantine-Indicator-indicator"),
  ).toBeInTheDocument();
});
