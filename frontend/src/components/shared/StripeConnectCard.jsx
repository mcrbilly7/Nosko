import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { CreditCard, CheckCircle2, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StripeConnectCard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await api.get("/stripe/status");
      setStatus(r.data);
    } catch (e) {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const onboard = async () => {
    setBusy(true);
    try {
      const r = await api.post("/stripe/onboard", { origin: window.location.origin });
      window.location.href = r.data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start Stripe onboarding");
      setBusy(false);
    }
  };

  if (loading) return (
    <div className="border-2 border-black p-6 bg-white" data-testid="stripe-connect-loading">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  );

  const ready = status?.connected && status?.payouts_enabled;
  const partial = status?.connected && !status?.payouts_enabled;

  return (
    <div className="border-2 border-black p-6 bg-white" data-testid="stripe-connect-card">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6" />
          <div>
            <div className="overline">Payout account · Stripe Connect</div>
            <div className="font-display text-2xl tracking-tighter mt-0.5">
              {ready ? "Connected & ready" : partial ? "Onboarding in progress" : "Not connected"}
            </div>
          </div>
        </div>
        <div>
          {ready && <span className="inline-flex items-center gap-1 overline text-[10px] bg-[#16A34A] text-white px-2 py-1"><CheckCircle2 className="w-3 h-3" /> PAYOUTS ENABLED</span>}
          {partial && <span className="inline-flex items-center gap-1 overline text-[10px] bg-yellow-200 border border-black px-2 py-1"><AlertTriangle className="w-3 h-3" /> ACTION NEEDED</span>}
        </div>
      </div>

      {status?.connected && (
        <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
          <div className="border border-black p-3"><div className="overline text-[10px]">Charges</div><div>{status.charges_enabled ? "✓" : "—"}</div></div>
          <div className="border border-black p-3"><div className="overline text-[10px]">Payouts</div><div>{status.payouts_enabled ? "✓" : "—"}</div></div>
          <div className="border border-black p-3"><div className="overline text-[10px]">Details</div><div>{status.details_submitted ? "✓" : "—"}</div></div>
        </div>
      )}

      {status?.requirements?.currently_due?.length > 0 && (
        <div className="mt-3 text-sm bg-yellow-50 border border-yellow-300 p-3">
          <div className="overline text-[10px]">Stripe needs</div>
          <div className="font-mono text-xs">{status.requirements.currently_due.join(", ")}</div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn-brutal dark" onClick={onboard} disabled={busy} data-testid="stripe-onboard-btn">
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</> : <>
            {status?.connected ? "Update payout details" : "Connect with Stripe"} <ExternalLink className="w-4 h-4" />
          </>}
        </button>
        {status?.connected && (
          <button className="btn-brutal ghost" onClick={fetchStatus} data-testid="stripe-refresh-btn">Refresh status</button>
        )}
      </div>
      <p className="text-xs text-neutral-500 mt-3">
        We use Stripe to securely send your payouts. Stripe collects W9/banking info — Nosko never sees it.
      </p>
    </div>
  );
}
