import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Zap, LogOut, User } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const onDashboard = loc.pathname.startsWith("/admin") || loc.pathname.startsWith("/dashboard");

  if (onDashboard) return null;

  return (
    <header className="border-b border-black/10 bg-white sticky top-0 z-30">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between px-6 lg:px-10 py-4">
        <Link to="/" className="flex items-center gap-2.5" data-testid="nav-home-link">
          <div className="w-9 h-9 bg-[#FFD600] border-2 border-black flex items-center justify-center">
            <Zap className="w-5 h-5" strokeWidth={3} />
          </div>
          <div>
            <div className="font-display text-xl tracking-tighter leading-none">NOSKO</div>
            <div className="overline text-[10px] text-neutral-500">HANDYMAN CO. · DFW</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-7 overline text-neutral-700">
          <Link to="/#services" data-testid="nav-services-link">Services</Link>
          <Link to="/request" data-testid="nav-request-link">Request Quote</Link>
          <Link to="/join/worker" data-testid="nav-worker-link">Become Handyman</Link>
          <Link to="/join/marketer" data-testid="nav-marketer-link">Marketer</Link>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to={user.role === "admin" || user.role === "developer" ? "/admin"
                  : user.role === "worker" ? "/dashboard/worker"
                  : user.role === "marketer" ? "/dashboard/marketer"
                  : "/account"}
                className="btn-brutal ghost"
                data-testid="nav-dashboard-btn"
              >
                <User className="w-4 h-4" /> Account
              </Link>
              <button className="btn-brutal" onClick={logout} data-testid="nav-logout-btn">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="overline text-neutral-700 hidden sm:inline" data-testid="nav-login-link">Sign in</Link>
              <Link to="/register" className="btn-brutal" data-testid="nav-register-btn">Get started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
