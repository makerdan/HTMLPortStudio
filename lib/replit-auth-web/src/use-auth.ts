import { useCallback, useEffect, useState } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("authError") === "login_failed") {
      if (!cancelled) setError("Login could not be completed. Please try again.");
      params.delete("authError");
      const query = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }
    fetch("/api/auth/user", { credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{ user: AuthUser | null }>;
      })
      .then((data) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setError("We could not check your login. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const returnTo = "/";
  const login = useCallback(() => {
    window.location.href = `/api/login?returnTo=${encodeURIComponent(returnTo)}`;
  }, [returnTo]);
  const logout = useCallback(() => {
    window.location.href = `/api/logout?returnTo=${encodeURIComponent(returnTo)}`;
  }, [returnTo]);
  return { user, isLoading, isAuthenticated: Boolean(user), error, login, logout };
}