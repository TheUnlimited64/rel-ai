import { createTRPCProxyClient, httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@rel-ai/backend";

const TOKEN_KEY = "rel_ai_token";

function customFetch(url: RequestInfo | URL, options?: RequestInit) {
  return fetch(url, options).then((response) => {
    if (response.status === 401 && !window.location.pathname.startsWith("/login")) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
    }
    return response;
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
