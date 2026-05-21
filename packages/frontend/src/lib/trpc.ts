import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@rel-ai/backend";

const TOKEN_KEY = "rel_ai_token";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: "/api/trpc",
      headers() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          return { Authorization: `Bearer ${token}` };
        }
        return {};
      },
      fetch(url, options) {
        return fetch(url, options).then((response) => {
          if (response.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "/login";
          }
          return response;
        });
      },
    }),
  ],
});
