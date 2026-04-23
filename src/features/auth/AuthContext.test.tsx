import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vite-plus/test";
import { AuthProvider, useAuth } from "./AuthContext";
import { RequireAuth, RequireRole } from "./guards";
import { ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/api-types";

const boardUser: AuthUser = {
  email: "board@example.com",
  name: "Styremedlem",
  role: "board",
  created_at: "2026-04-23",
};

function renderWithAuth(
  ui: React.ReactNode,
  opts: {
    fetchMe: () => Promise<{ user: AuthUser }>;
    navigate?: (url: string) => void;
  },
) {
  return render(
    <AuthProvider fetchMe={opts.fetchMe} navigate={opts.navigate}>
      {ui}
    </AuthProvider>,
  );
}

describe("RequireAuth", () => {
  test("shows loading then authenticated content", async () => {
    const fetchMe = vi.fn().mockResolvedValue({ user: boardUser });
    renderWithAuth(<RequireAuth>Secret</RequireAuth>, { fetchMe });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(await screen.findByText("Secret")).toBeInTheDocument();
  });

  test("shows login screen on 401", async () => {
    const fetchMe = vi.fn().mockRejectedValue(new ApiError(401, null, "Missing token"));
    const navigate = vi.fn();
    renderWithAuth(<RequireAuth>Secret</RequireAuth>, { fetchMe, navigate });
    const button = await screen.findByRole("button", { name: /logg inn/i });
    await userEvent.click(button);
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining("/cdn-cgi/access/login"));
  });

  test("shows forbidden screen on 403", async () => {
    const fetchMe = vi.fn().mockRejectedValue(new ApiError(403, null, "Kontakt styret"));
    const navigate = vi.fn();
    renderWithAuth(<RequireAuth>Secret</RequireAuth>, { fetchMe, navigate });
    expect(await screen.findByText(/kontakt styret/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /logg ut/i }));
    expect(navigate).toHaveBeenCalledWith("/cdn-cgi/access/logout");
  });

  test("network error treated as unauthenticated", async () => {
    const fetchMe = vi.fn().mockRejectedValue(new Error("net down"));
    renderWithAuth(<RequireAuth>Secret</RequireAuth>, { fetchMe });
    expect(await screen.findByRole("button", { name: /logg inn/i })).toBeInTheDocument();
  });
});

describe("RequireRole", () => {
  test("allows matching role", async () => {
    const fetchMe = vi.fn().mockResolvedValue({ user: boardUser });
    renderWithAuth(
      <RequireAuth>
        <RequireRole roles={["board"]}>Admin</RequireRole>
      </RequireAuth>,
      { fetchMe },
    );
    expect(await screen.findByText("Admin")).toBeInTheDocument();
  });

  test("blocks non-matching role", async () => {
    const fetchMe = vi.fn().mockResolvedValue({
      user: { ...boardUser, role: "craftsman" as const },
    });
    renderWithAuth(
      <RequireAuth>
        <RequireRole roles={["board"]}>Admin</RequireRole>
      </RequireAuth>,
      { fetchMe },
    );
    expect(await screen.findByText(/mangler tilgang/i)).toBeInTheDocument();
  });

  test("renders fallback when provided", async () => {
    const fetchMe = vi.fn().mockResolvedValue({
      user: { ...boardUser, role: "craftsman" as const },
    });
    renderWithAuth(
      <RequireAuth>
        <RequireRole roles={["board"]} fallback={<div>fb</div>}>
          Admin
        </RequireRole>
      </RequireAuth>,
      { fetchMe },
    );
    expect(await screen.findByText("fb")).toBeInTheDocument();
  });
});

describe("useAuth refresh", () => {
  test("can refetch user", async () => {
    const fetchMe = vi
      .fn()
      .mockResolvedValueOnce({ user: boardUser })
      .mockResolvedValueOnce({ user: { ...boardUser, name: "Ny" } });
    function Probe() {
      const { state, refresh } = useAuth();
      return (
        <button type="button" onClick={() => refresh()}>
          {state.status === "authenticated" ? state.user.name : "?"}
        </button>
      );
    }
    renderWithAuth(<Probe />, { fetchMe });
    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("Styremedlem"));
    await userEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("Ny"));
  });
});
