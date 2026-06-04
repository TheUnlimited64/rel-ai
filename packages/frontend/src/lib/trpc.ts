import { createTRPCProxyClient, httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@rel-ai/backend";
import { toast } from "sonner";

export function customFetch(url: RequestInfo | URL, options?: RequestInit) {
  return fetch(url, options).then((response) => {
    if (response.status === 401 && !window.location.pathname.startsWith("/login")) {
      toast.error("Session expired. Please sign in again.");
    } else if (!response.ok && response.status !== 401) {
      console.warn(`[customFetch] HTTP ${String(response.status)} ${response.statusText} for ${typeof url === "string" ? url : url instanceof URL ? url.href : url.url}`);
    }
    return response;
  }).catch((err: unknown) => {
    throw new Error("Unable to connect to server. Is the backend running?", { cause: err });
  });
}

const sharedHttpLink = httpLink({
  url: "/api/trpc",
  fetch: customFetch,
});

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [sharedHttpLink],
});

export const trpcReact = createTRPCReact<AppRouter>();

export const trpcReactClient = trpcReact.createClient({
  links: [sharedHttpLink],
});
