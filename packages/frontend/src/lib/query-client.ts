import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const CONNECTION_ERROR_PATTERNS = ["Unable to connect", "Failed to fetch", "NetworkError"];

function isConnectionError(message: string) {
  return CONNECTION_ERROR_PATTERNS.some((p) => message.includes(p));
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof Error && isConnectionError(error.message)) {
          return failureCount < 3;
        }
        return false;
      },
    },
  },
});

queryClient.getQueryCache().config.onError = (error) => {
  if (error instanceof Error && isConnectionError(error.message)) {
    toast.error("Connection lost. Retrying...");
  }
};
