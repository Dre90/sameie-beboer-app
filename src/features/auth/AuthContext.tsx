import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiRequest } from "@/lib/api";
import type { AuthUser } from "@/lib/api-types";

export type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden"; message: string }
  | { status: "authenticated"; user: AuthUser };

type AuthContextValue = {
  state: AuthState;
  refresh: () => Promise<void>;
  /** Triggers Cloudflare Access login by navigating to the Access-protected login endpoint. */
  login: () => void;
  /** Triggers Cloudflare Access logout by navigating to the logout endpoint. */
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type Props = {
  children: ReactNode;
  /** Inject fetchMe for tests. */
  fetchMe?: () => Promise<{ user: AuthUser }>;
  /** Inject navigator for tests (defaults to window.location). */
  navigate?: (url: string) => void;
};

const defaultFetchMe = () =>
  apiRequest<{ user: AuthUser }>(`/api/me?t=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache" },
  });
const defaultNavigate = (url: string) => {
  window.location.href = url;
};

export function AuthProvider({
  children,
  fetchMe = defaultFetchMe,
  navigate = defaultNavigate,
}: Props) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const refresh = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const { user } = await fetchMe();
      setState({ status: "authenticated", user });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setState({ status: "unauthenticated" });
          return;
        }
        if (err.status === 403) {
          setState({ status: "forbidden", message: err.message });
          return;
        }
      }
      // Network / unknown errors — treat as unauthenticated so user can retry.
      setState({ status: "unauthenticated" });
    }
  }, [fetchMe]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      refresh,
      login: () => {
        // Navigate to /api/login which is covered by the Access app — Access
        // intercepts the request and redirects to the team-domain OTP page.
        // (Cloudflare Access has no documented way to prefill the email.)
        navigate("/api/login");
      },
      logout: () => navigate("/api/logout"),
    }),
    [state, refresh, navigate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/**
 * Hook that asserts an authenticated user is present. Throws if not —
 * intended for use inside components wrapped by `<RequireAuth />`.
 */
export function useCurrentUser(): AuthUser {
  const { state } = useAuth();
  if (state.status !== "authenticated") {
    throw new Error("useCurrentUser called without authenticated user");
  }
  return state.user;
}
