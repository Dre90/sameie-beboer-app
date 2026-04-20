import { expect, test } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App.tsx";

test("renders heading", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /sameie beboer-app/i })).toBeInTheDocument();
});

test("increments counter on click", async () => {
  const user = userEvent.setup();
  render(<App />);
  const btn = screen.getByRole("button", { name: /count is 0/i });
  await user.click(btn);
  expect(btn).toHaveTextContent(/count is 1/i);
});
