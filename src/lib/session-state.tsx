// Client-side session state. Exposes the safe RPC stubs of the server
// functions; no Supabase credential ever lives in this (client) bundle.
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  signIn,
  signOut,
  getSessionUser,
  type PublicUser,
} from "@/server-functions/auth";

export type SessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: PublicUser };

type SessionContextValue = {
  session: SessionState;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  const refresh = async () => {
    setSession({ status: "loading" });
    try {
      const user = await getSessionUser();
      setSession(user ? { status: "authenticated", user } : { status: "anonymous" });
    } catch {
      setSession({ status: "anonymous" });
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await signIn({ data: { email, password } });
    if (res.ok) {
      setSession({ status: "authenticated", user: res.user });
      return { ok: true };
    }
    return { ok: false, error: res.error };
  };

  const logout = async () => {
    await signOut();
    setSession({ status: "anonymous" });
  };

  return (
    <SessionContext.Provider value={{ session, refresh, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

export type { PublicUser };
