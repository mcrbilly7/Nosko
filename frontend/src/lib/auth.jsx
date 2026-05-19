import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const loginWithPassword = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (res.data?.session_token) localStorage.setItem("nosko_session_token", res.data.session_token);
    setUser(res.data?.user || null);
    return res.data?.user;
  };

  const register = async (email, password, name) => {
    const res = await api.post("/auth/register", { email, password, name });
    if (res.data?.session_token) localStorage.setItem("nosko_session_token", res.data.session_token);
    setUser(res.data?.user || null);
    return res.data?.user;
  };

  const forgotPassword = async (email) => {
    await api.post("/auth/forgot-password", { email, origin: window.location.origin });
  };

  const resetPassword = async (token, password) => {
    await api.post("/auth/reset-password", { token, password });
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (e) { /* noop */ }
    localStorage.removeItem("nosko_session_token");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, loginWithGoogle, loginWithPassword, register, forgotPassword, resetPassword, logout, refresh: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (!detail) return err?.message || "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}
