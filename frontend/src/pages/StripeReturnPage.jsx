import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function StripeReturnPage() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate("/account", { replace: true }), 1800);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center max-w-md p-8">
        <CheckCircle2 className="w-12 h-12 text-[#16A34A] mx-auto" />
        <h1 className="font-display text-3xl mt-3 tracking-tighter">Back from Stripe</h1>
        <p className="text-neutral-600 mt-2">We're refreshing your payout status. Redirecting…</p>
      </div>
    </div>
  );
}
