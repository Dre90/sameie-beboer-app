import { afterEach, expect, test, vi } from "vite-plus/test";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { AuthProvider, RequireAuth, useAuth } from "./SessionProvider";

afterEach(() => vi.unstubAllGlobals());
function Content() {
  const { state, logout } = useAuth();
  return (
    <div>
      {state.status === "authenticated" && state.role}
      <button onClick={() => void logout()}>Ut</button>
    </div>
  );
}
function setup() {
  return render(
    <AuthProvider>
      <RequireAuth>
        <Content />
      </RequireAuth>
    </AuthProvider>,
  );
}
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

test("loads a remembered session and logs out", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(reply({ role: "board" }))
    .mockResolvedValueOnce(reply({ ok: true }));
  vi.stubGlobal("fetch", fetch);
  setup();
  expect(await screen.findByText("board")).toBeInTheDocument();
  await userEvent.click(screen.getByText("Ut"));
  expect(await screen.findByLabelText("Passord")).toHaveValue("");
});

test("password login gets the role from the server, never localStorage", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(reply({}, 401))
    .mockResolvedValueOnce(reply({ role: "craftsman" }));
  vi.stubGlobal("fetch", fetch);
  const storage = vi.spyOn(Storage.prototype, "setItem");
  setup();
  await userEvent.type(await screen.findByLabelText("Passord"), "testing");
  await userEvent.click(screen.getByRole("button", { name: "Logg inn" }));
  expect(await screen.findByText("craftsman")).toBeInTheDocument();
  expect(fetch.mock.calls[1][1].body).toBe(JSON.stringify({ password: "testing" }));
  expect(storage).not.toHaveBeenCalled();
  storage.mockRestore();
});

test("shows login errors and clears the password", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(reply({}, 401))
      .mockResolvedValueOnce(reply({ error: "Feil passord" }, 401)),
  );
  setup();
  await userEvent.type(await screen.findByLabelText("Passord"), "wrong");
  await userEvent.click(screen.getByRole("button", { name: "Logg inn" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Feil passord");
  expect(screen.getByLabelText("Passord")).toHaveValue("");
});

test("network failures are retryable, expired sessions hide data", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(reply({ role: "board" })),
  );
  setup();
  expect(screen.getByRole("main")).toContainElement(screen.getByRole("status"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Kunne ikke kontakte");
  expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { level: 1 }));
  expect(screen.getByRole("alert")).toHaveClass("*:data-[slot=alert-description]:text-destructive");
  expect(
    (await axe.run(screen.getByRole("main"), { rules: { "color-contrast": { enabled: false } } }))
      .violations,
  ).toEqual([]);
  await userEvent.click(screen.getByRole("button", { name: "Prøv igjen" }));
  await screen.findByText("board");
  await act(() => window.dispatchEvent(new Event("session-expired")));
  expect(screen.queryByText("board")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Passord")).toBeInTheDocument();
});

test("useAuth requires a provider", () => {
  expect(() => render(<Content />)).toThrow("useAuth requires AuthProvider");
});
