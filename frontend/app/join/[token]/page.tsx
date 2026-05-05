"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Users, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "joining" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      // Redirect to sign-up with return URL
      router.push(`/sign-up?redirect=/join/${token}`);
      return;
    }

    const join = async () => {
      setStatus("joining");
      try {
        // Ensure user exists in DB
        await api.post("/api/auth/sync-user", {
          clerk_user_id: user.id,
          email: user.primaryEmailAddress?.emailAddress || "",
          name: user.fullName || "",
        });

        const res = await api.post(`/api/household/join/${token}`);
        setMessage(`You've joined "${res.data.household_name}"!`);
        setStatus("success");
        setTimeout(() => router.push("/dashboard"), 2000);
      } catch (err: any) {
        setMessage(err.response?.data?.detail || "Failed to join household.");
        setStatus("error");
      }
    };

    join();
  }, [isLoaded, user, token, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#0A0A0F" }}
    >
      <div
        className="rounded-2xl border p-8 max-w-sm w-full text-center"
        style={{ backgroundColor: "#13131A", borderColor: "#2A2A38" }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "#6C63FF22" }}
        >
          <Users size={28} style={{ color: "#6C63FF" }} />
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "#F1F1F3" }}>
          Joining Household
        </h1>

        {(status === "loading" || status === "joining") && (
          <div className="flex flex-col items-center gap-3 mt-4">
            <Loader2 size={24} className="animate-spin" style={{ color: "#6C63FF" }} />
            <p className="text-sm" style={{ color: "#6B7280" }}>
              {status === "loading" ? "Checking your account..." : "Joining household..."}
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-3 mt-4">
            <CheckCircle2 size={32} style={{ color: "#22C55E" }} />
            <p className="text-sm" style={{ color: "#22C55E" }}>
              {message}
            </p>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Redirecting to dashboard...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 mt-4">
            <XCircle size={32} style={{ color: "#EF4444" }} />
            <p className="text-sm" style={{ color: "#EF4444" }}>
              {message}
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm px-4 py-2 rounded-lg mt-2"
              style={{ backgroundColor: "#6C63FF", color: "white" }}
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
