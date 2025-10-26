"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type AuthState = {
  token: string | null;
  userId: string | null;
};

type AuthContextType = AuthState & {
  isReady: boolean;
  setAuth: (next: AuthState) => void;
  logout: () => void;
  displayName: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const decodeNameFromToken = useCallback((t: string | null): string | null => {
    if (!t) return null;
    try {
      const parts = t.split(".");
      if (parts.length < 2) return null;
      const payload = parts[1];
      // base64url -> base64 with padding
      let b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4 !== 0) b64 += "=";

      let json: string;
      if (typeof window !== "undefined") {
        // Decode to bytes, then to UTF-8 string to avoid mojibake
        const binary = atob(b64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        const decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : undefined;
        json = decoder ? decoder.decode(bytes) : decodeURIComponent(escape(binary));
      } else {
        json = Buffer.from(b64, "base64").toString("utf-8");
      }
      const obj = JSON.parse(json);
      return typeof obj?.name === "string" ? obj.name : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const u = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    setToken(t);
    setUserId(u);
    setDisplayName(decodeNameFromToken(t));
    setIsReady(true);
  }, [decodeNameFromToken]);

  const setAuth = useCallback((next: AuthState) => {
    setToken(next.token);
    setUserId(next.userId);
    setDisplayName(decodeNameFromToken(next.token));
    if (typeof window !== "undefined") {
      if (next.token) localStorage.setItem("token", next.token);
      else localStorage.removeItem("token");
      if (next.userId) localStorage.setItem("userId", next.userId);
      else localStorage.removeItem("userId");
    }
    setIsReady(true);
  }, [decodeNameFromToken]);

  const logout = useCallback(() => setAuth({ token: null, userId: null }), [setAuth]);

  const value = useMemo(
    () => ({ token, userId, isReady, setAuth, logout, displayName }),
    [token, userId, isReady, setAuth, logout, displayName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
