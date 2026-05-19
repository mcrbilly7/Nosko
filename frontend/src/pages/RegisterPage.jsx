import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, formatApiError } from "@/lib/auth";
import Navbar from "@/components/shared/Navbar";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await register(form.email, form.password, form.name);
      toast.success("Account created — check your email");
      navigate("/dashboard", { replace: true });
    } catch (e2) {
      setErr(formatApiError(e2));
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <main className="max-w-md mx-auto px-6 py-16">
        <div className="overline">New account</div>
        <h1 className="font-display text-4xl tracking-tighter mt-1">Get started.</h1>
        <p className="text-neutral-600 mt-2">Takes 30 seconds.</p>

        <button onClick={loginWithGoogle} className="btn-brutal ghost w-full mt-8" data-testid="register-google-btn">
          Continue with Google
        </button>

        <div className="my-6 overline text-center text-neutral-400">— or —</div>

        <form onSubmit={submit} className="grid gap-3" data-testid="register-form">
          <div>
            <label className="overline">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="register-name" />
          </div>
          <div>
            <label className="overline">Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="register-email" />
          </div>
          <div>
            <label className="overline">Password (8+ chars)</label>
            <input type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="register-password" />
          </div>
          {err && <div className="text-red-600 text-sm" data-testid="register-error">{err}</div>}
          <button type="submit" className="btn-brutal dark mt-2" disabled={busy} data-testid="register-submit-btn">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create account"}
          </button>
        </form>

        <div className="text-sm mt-6">
          Already have an account? <Link to="/login" className="underline" data-testid="register-login-link">Sign in</Link>
        </div>
      </main>
    </div>
  );
}
