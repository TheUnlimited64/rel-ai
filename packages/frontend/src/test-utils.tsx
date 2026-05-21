import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@rel-ai/backend";

export const trpcReact = createTRPCReact<AppRouter>();

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface TestWrapperProps {
  children: React.ReactNode;
}

export function TestWrapper({ children }: TestWrapperProps) {
  const queryClient = createTestQueryClient();
  const trpcClient = trpcReact.createClient({
    links: [
      httpLink({ url: "/api/trpc" }),
    ],
  });

  return (
    <trpcReact.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpcReact.Provider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): ReturnType<typeof render> {
  return render(ui, { wrapper: TestWrapper, ...options });
}
