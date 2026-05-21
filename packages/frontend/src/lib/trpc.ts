import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@rel-ai/backend";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: "/api/trpc",
    }),
  ],
});
