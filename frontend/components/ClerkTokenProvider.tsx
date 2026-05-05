"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { registerTokenGetter } from "@/lib/api";

/**
 * Registers the Clerk token getter so api.ts interceptor can attach
 * auth headers to every request without needing hooks at each call site.
 */
export default function ClerkTokenProvider() {
  const { getToken } = useAuth();

  useEffect(() => {
    registerTokenGetter(() => getToken());
  }, [getToken]);

  return null;
}
