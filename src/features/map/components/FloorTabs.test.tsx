import { expect, test, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FloorTabs } from "./FloorTabs";

test("clicking a tab calls onChange with the numeric floor", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<FloorTabs floor={1} onChange={onChange} />);
  await user.click(screen.getByRole("tab", { name: "3. etg" }));
  expect(onChange).toHaveBeenCalledWith(3);
});

test("selected tab reflects the floor prop", () => {
  render(<FloorTabs floor={2} onChange={() => {}} />);
  expect(screen.getByRole("tab", { name: "2. etg" })).toHaveAttribute("aria-selected", "true");
});
