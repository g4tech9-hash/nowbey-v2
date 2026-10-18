import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type SessionUser } from "./api";
import { releasePushOnSignOut } from "./push";
import { setToken } from "./storage";

type SessionValue = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signIn: (handle: string, password: string) => Promise<void>;
  signUp: (body: { handle: string; email: string; password: string; displayName?: string; parish?: string; termsAccepted: boolean }) => Promise<void>;
  /** Finishes a Google sign-in that happened in the browser, from the code in the deep link. */
  signInWithGoogleCode: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.session();
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      loading,
      refresh,
      signIn: async (handle, password) => {
        const res = await api.signIn(handle, password);
        if (res.token) await setToken(res.token);
        await refresh();
      },
      signUp: async (body) => {
        const res = await api.signUp(body);
        if (res.token) await setToken(res.token);
        await refresh();
      },
      signInWithGoogleCode: async (code) => {
        const res = await api.googleExchange(code);
        if (!res.token) throw new Error("Google sign-in did not return a session. Please try again.");
        await setToken(res.token);
        await refresh();
      },
      signOut: async () => {
        // Drop this phone's push registration while the session is still valid, so the next
        // person to sign in here does not inherit the last member's alerts.
        await releasePushOnSignOut();
        try {
          await api.signOut();
        } catch {
          /* signing out locally is enough */
        }
        await setToken(null);
        setUser(null);
      },
    }),
    [user, loading, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
