import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { UsersAdmin } from "./UsersAdmin";
import { AuthProvider, RequireAuth } from "@/features/auth";
import type { AuthUser } from "@/lib/api-types";

const boardUser: AuthUser = {
  email: "board@example.com",
  name: "Styret",
  role: "board",
  created_at: "",
};

const listMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const removeMock = vi.fn();

vi.mock("@/lib/api-client", () => ({
  api: {
    users: {
      list: () => listMock(),
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      remove: (...args: unknown[]) => removeMock(...args),
    },
  },
}));

function renderAdmin() {
  return render(
    <AuthProvider fetchMe={() => Promise.resolve({ user: boardUser })}>
      <MemoryRouter>
        <RequireAuth>
          <UsersAdmin />
        </RequireAuth>
      </MemoryRouter>
    </AuthProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("UsersAdmin", () => {
  test("lists users and prevents deleting yourself", async () => {
    listMock.mockResolvedValue({
      users: [
        boardUser,
        {
          email: "w@example.com",
          name: "Worker",
          role: "craftsman",
          created_at: "",
        },
      ],
    });
    renderAdmin();
    expect(await screen.findByText("Worker")).toBeInTheDocument();
    expect(screen.getAllByText("Styret").length).toBeGreaterThan(0);

    const deleteButtons = screen.getAllByRole("button", { name: /slett/i });
    expect(deleteButtons[0]).toBeDisabled(); // self
    expect(deleteButtons[1]).toBeEnabled();
  });

  test("creates a new user", async () => {
    listMock.mockResolvedValue({ users: [boardUser] });
    createMock.mockResolvedValue({
      user: { email: "w@example.com", name: "W", role: "craftsman", created_at: "" },
    });
    renderAdmin();
    await screen.findByText("Styret");

    await userEvent.type(screen.getByPlaceholderText("E-post"), "W@Example.COM");
    await userEvent.type(screen.getByPlaceholderText("Navn"), "Worker");
    await userEvent.click(screen.getByRole("button", { name: /legg til/i }));

    expect(createMock).toHaveBeenCalledWith({
      email: "w@example.com",
      name: "Worker",
      role: "craftsman",
    });
  });

  test("shows error message on create failure", async () => {
    listMock.mockResolvedValue({ users: [boardUser] });
    createMock.mockRejectedValue(
      new (await import("@/lib/api")).ApiError(409, null, "Bruker finnes allerede"),
    );
    renderAdmin();
    await screen.findByText("Styret");
    await userEvent.type(screen.getByPlaceholderText("E-post"), "x@y.no");
    await userEvent.type(screen.getByPlaceholderText("Navn"), "X");
    await userEvent.click(screen.getByRole("button", { name: /legg til/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/finnes allerede/);
  });

  test("changes role via select", async () => {
    listMock.mockResolvedValue({
      users: [
        boardUser,
        {
          email: "w@example.com",
          name: "W",
          role: "craftsman",
          created_at: "",
        },
      ],
    });
    updateMock.mockResolvedValue({});
    renderAdmin();
    await screen.findByText("W");
    const select = screen.getByLabelText("Rolle for w@example.com");
    await userEvent.selectOptions(select, "board");
    expect(updateMock).toHaveBeenCalledWith("w@example.com", { role: "board" });
  });

  test("shows error on list failure", async () => {
    listMock.mockRejectedValue(new Error("boom"));
    renderAdmin();
    expect(await screen.findByRole("alert")).toHaveTextContent(/boom/);
  });
});
