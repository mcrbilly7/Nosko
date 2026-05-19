import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, formatApiError } from "@/lib/auth";
import Navbar from "@/components/shared/Navbar";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (pw !== pw2) { setErr("Passwords don't match"); return; }
    setBusy(true); setErr(null);
    try { await resetPassword(token, pw); setDone(true); setTimeout(() => navigate("/login"), 2000); }
    catch (e2) { setErr(formatApiError(e2)); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <main className="max-w-md mx-auto px-6 py-16">
        <div className="overline">Account</div>
        <h1 className="font-display text-4xl tracking-tighter mt-1">Set a new password</h1>
        {!token ? (
          <p className="text-red-600 mt-6">Missing reset token. <Link to="/forgot-password" className="underline">Request a new link</Link>.</p>
        ) : done ? (
          <div className="mt-8 border-2 border-black p-6 bg-[#F9FAFB]">
            <CheckCircle2 className="w-8 h-8 text-[#16A34A]" />
            <p className="mt-2">Password updated. Redirecting to sign in…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3 mt-8" data-testid="reset-form">
            <div>
              <label className="overline">New password (8+ chars)</label>
              <input type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} data-testid="reset-password" />
            </div>
            <div>
              <label className="overline">Confirm password</label>
              <input type="password" minLength={8} required value={pw2} onChange={(e) => setPw2(e.target.value)} data-testid="reset-password2" />
            </div>
            {err && <div className="text-red-600 text-sm">{err}</div>}
            <button className="btn-brutal dark" disabled={busy} data-testid="reset-submit-btn">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save new password"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
