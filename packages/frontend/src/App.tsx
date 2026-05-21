import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Layout } from "./Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider, RequireAuth, RedirectIfAuth } from "./lib/auth";
import { LoginPage } from "./features/auth/login";
import { ProvidersPage } from "./features/providers/page";
import { ProviderDetailPage } from "./features/providers/detail";
import { EndpointsPage } from "./features/endpoints/page";
import { EndpointDetailPage } from "./features/endpoints/detail";
import { ModelsPage } from "./features/models/page";
import { ModelDetailPage } from "./features/models/detail";
import { LogsPage } from "./features/logs/page";
import { TokensPage } from "./features/auth/page";

const router = createBrowserRouter([
  {
    element: (
      <RedirectIfAuth>
        <LoginPage />
      </RedirectIfAuth>
    ),
    path: "/login",
  },
  {
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <ProvidersPage /> },
      { path: "providers", element: <ProvidersPage /> },
      { path: "providers/:id", element: <ProviderDetailPage /> },
      { path: "endpoints", element: <EndpointsPage /> },
      { path: "endpoints/:id", element: <EndpointDetailPage /> },
      { path: "models", element: <ModelsPage /> },
      { path: "models/:id", element: <ModelDetailPage /> },
      { path: "logs", element: <LogsPage /> },
      { path: "tokens", element: <TokensPage /> },
    ],
  },
]);

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
