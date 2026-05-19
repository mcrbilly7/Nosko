import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const ADMIN_ROLES = new Set(["admin", "developer"]);

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const check = (u) => {
    if (!u) return false;
    if (!role) return true;
    if (role === "admin") return ADMIN_ROLES.has(u.role);
    return u.role === role || ADMIN_ROLES.has(u.role);
  };

  if (location.state?.user) {
    if (!check(location.state.user)) return <Navigate to="/" replace />;
    return children;
  }
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="overline">Loading…</div></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!check(user)) return <Navigate to="/" replace />;
  return children;
}
