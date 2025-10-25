"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type AuthState = {
  token: string | null;
  userId: string | null;
};

type AuthContextType = AuthState & {
  setAuth: (next: AuthState) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const u = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    setToken(t);
    setUserId(u);
  }, []);

  const setAuth = useCallback((next: AuthState) => {
    setToken(next.token);
    setUserId(next.userId);
    if (typeof window !== "undefined") {
      if (next.token) localStorage.setItem("token", next.token);
      else localStorage.removeItem("token");
      if (next.userId) localStorage.setItem("userId", next.userId);
      else localStorage.removeItem("userId");
    }
  }, []);

  const logout = useCallback(() => setAuth({ token: null, userId: null }), [setAuth]);

  const value = useMemo(() => ({ token, userId, setAuth, logout }), [token, userId, setAuth, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
