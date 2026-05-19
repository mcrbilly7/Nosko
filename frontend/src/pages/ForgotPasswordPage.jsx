import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, formatApiError } from "@/lib/auth";
import Navbar from "@/components/shared/Navbar";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { await forgotPassword(email); setSent(true); }
    catch (e2) { setErr(formatApiError(e2)); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <main className="max-w-md mx-auto px-6 py-16">
        <div className="overline">Account</div>
        <h1 className="font-display text-4xl tracking-tighter mt-1">Forgot password</h1>
        {sent ? (
          <div className="mt-8 border-2 border-black p-6 bg-[#F9FAFB]">
            <CheckCircle2 className="w-8 h-8 text-[#16A34A]" />
            <p className="mt-2">If <b>{email}</b> exists, a reset link is on its way. Check your inbox.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3 mt-8" data-testid="forgot-form">
            <p className="text-sm text-neutral-600">We'll email you a reset link.</p>
            <div>
              <label className="overline">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="forgot-email" />
            </div>
            {err && <div className="text-red-600 text-sm">{err}</div>}
            <button className="btn-brutal dark" disabled={busy} data-testid="forgot-submit-btn">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : "Send reset link"}
            </button>
          </form>
        )}
        <div className="text-sm mt-6">
          <Link to="/login" className="underline">Back to sign in</Link>
        </div>
      </main>
    </div>
  );
}
