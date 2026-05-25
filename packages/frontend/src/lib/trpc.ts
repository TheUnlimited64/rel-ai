import { createTRPCProxyClient, httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@rel-ai/backend";

const TOKEN_KEY = "rel_ai_token";

// Synchronizes concurrent 401 handling so only one redirect fires.
// After the redirect completes (user navigates back / re-authenticates),
// `resetRedirectLock()` must be called — typically from the login flow.
let redirectLock = false;

/** Called by the auth layer after a successful login to allow future 401 redirects. */
export function resetRedirectLock() {
  redirectLock = false;
}

export function customFetch(url: RequestInfo | URL, options?: RequestInit) {
  return fetch(url, options).then((response) => {
    if (
      response.status === 401 &&
      !window.location.pathname.startsWith("/login") &&
      !redirectLock
    ) {
      redirectLock = true;
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
    } else if (!response.ok) {
      console.warn(`[customFetch] HTTP ${response.status} ${response.statusText} for ${url}`);
    }
    return response;
  }).catch((err) => {
    throw new Error("Unable to connect to server. Is the backend running?", { cause: err });
  });
}

const sharedHttpLink = httpLink({
  url: "/api/trpc",
  headers() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  },
  fetch: customFetch,
});

// Used by login.tsx — called outside React provider context, so proxy client is required
export const trpc = createTRPCProxyClient<AppRouter>({
  links: [sharedHttpLink],
});

export const trpcReact = createTRPCReact<AppRouter>();

export const trpcReactClient = trpcReact.createClient({
  links: [sharedHttpLink],
});
