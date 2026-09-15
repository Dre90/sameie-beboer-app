import { afterEach, expect, test, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

afterEach(() => vi.unstubAllGlobals());
test("the application starts with password login and no personal fields", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
  render(<App />);
  expect(await screen.findByLabelText("Passord")).toBeInTheDocument();
  expect(screen.queryByPlaceholderText(/epost/)).not.toBeInTheDocument();
  expect(screen.queryByText("Admin")).not.toBeInTheDocument();
});
