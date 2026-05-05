import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Attach a Clerk session token to a request.
 * Call setApiToken(token) after getting it from useAuth().getToken()
 * in a component, or use makeAuthenticatedRequest() directly.
 */
api.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    try {
      // Clerk attaches the active session to window.Clerk after hydration
      const token = await (window as any).__clerk_token_getter?.();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_) {
      // no-op — some calls may not need auth
    }
  }
  return config;
});

/**
 * Register a token getter function.
 * Call this once inside a ClerkProvider context (e.g. in a layout useEffect).
 */
export function registerTokenGetter(getter: () => Promise<string | null>) {
  if (typeof window !== "undefined") {
    (window as any).__clerk_token_getter = getter;
  }
}

export default api;
