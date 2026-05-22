import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const schema = z.object({ token: z.string().min(1, "Token is required") });
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const verifyMutation = useMutation({
    mutationFn: (data: { token: string }) => trpc.auth.verifyToken.mutate(data),
    onSuccess: (result, variables) => {
      if (result.valid) {
        login(variables.token);
        navigate("/providers", { replace: true });
      } else {
        setError("token", { message: "Invalid token. Please check and try again." });
      }
    },
    onError: () => {
      setError("token", { message: "Invalid token. Please check and try again." });
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">RelAI</h1>
          <p className="text-sm text-muted-foreground">
            Enter your bearer token to sign in.
          </p>
        </div>
        <form onSubmit={handleSubmit((d) => verifyMutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <input
              type="password"
              {...register("token")}
              placeholder="Bearer token"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              autoFocus
            />
          </div>
          {errors.token && (
            <p className="text-sm text-destructive">{errors.token.message}</p>
          )}
          <Button type="submit" className="w-full" disabled={verifyMutation.isPending}>
            {verifyMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
