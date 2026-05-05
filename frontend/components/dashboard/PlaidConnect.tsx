"use client";

import { useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Link2, CheckCircle2, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface PlaidConnectProps {
  onSuccess?: () => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function PlaidConnect({ onSuccess }: PlaidConnectProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "exchanging" | "syncing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const fetchLinkToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/plaid/create-link-token");
      setLinkToken(res.data.link_token);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to initialize Plaid. Check API keys.");
      setLoading(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken || "",
    onSuccess: useCallback(
      async (public_token: string, metadata: any) => {
        setLoading(true);
        setError(null);

        // Step 1: Exchange token (backend also fires transactions/refresh)
        setStatus("exchanging");
        try {
          await api.post("/api/plaid/exchange-token", {
            public_token,
            institution_name: metadata?.institution?.name || "",
          });
        } catch (err: any) {
          setError(err.response?.data?.detail || "Failed to connect account.");
          setLoading(false);
          setStatus("idle");
          return;
        }

        // Step 2: Wait 2s for Plaid Sandbox to process the refresh
        setStatus("syncing");
        await sleep(2000);

        // Step 3: Notify parent to pull fresh budget-status
        setStatus("done");
        setLoading(false);
        onSuccess?.();
      },
      [onSuccess]
    ),
    onExit: () => {
      setLinkToken(null);
      setLoading(false);
      setStatus("idle");
    },
  });

  // Auto-open Plaid Link once the token is ready
  if (linkToken && ready) {
    open();
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: "#22C55E" }}>
        <CheckCircle2 size={16} />
        <span>Bank account connected!</span>
      </div>
    );
  }

  const buttonLabel =
    status === "exchanging"
      ? "Connecting..."
      : status === "syncing"
      ? "Syncing transactions..."
      : loading
      ? "Opening Plaid..."
      : "Connect Bank Account";

  return (
    <div>
      <button
        onClick={fetchLinkToken}
        disabled={loading || status !== "idle"}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        style={{ backgroundColor: "#6C63FF", color: "white" }}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
        {buttonLabel}
      </button>
      {error && (
        <p className="text-xs mt-2" style={{ color: "#EF4444" }}>
          {error}
        </p>
      )}
    </div>
  );
}
