import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

const schema = z.object({ password: z.string().min(1, "Password is required") });
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

  const onSubmit = async (data: FormValues) => {
    const success = await login(data.password);
    if (success) {
      navigate("/providers", { replace: true });
    } else {
      setError("password", { message: "Invalid password. Please try again." });
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background"
    >
      {/* Background: radial amber glow + dot grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 60% 50% at 50% 50%, oklch(0.73 0.19 62 / 0.07) 0%, transparent 70%)",
            "radial-gradient(circle, oklch(0.92 0.004 250 / 0.06) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "100% 100%, 32px 32px",
        }}
      />

      <div className="relative z-10 w-full max-w-xs px-4">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded"
            style={{
              background: "oklch(0.73 0.19 62 / 0.12)",
              border: "1px solid oklch(0.73 0.19 62 / 0.35)",
              boxShadow: "0 0 20px oklch(0.73 0.19 62 / 0.12)",
            }}
          >
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="text-center">
            <h1
              className="font-mono text-2xl font-bold text-foreground"
              style={{ letterSpacing: "0.25em" }}
            >
              RELAI
            </h1>
            <p
              className="mt-1 text-xs text-muted-foreground"
              style={{ letterSpacing: "0.18em" }}
            >
              ADMIN CONSOLE
            </p>
          </div>
        </div>

        {/* Form */}
        <div
          className="rounded border bg-card p-6"
          style={{
            borderColor: "oklch(0.22 0.012 245)",
            boxShadow: [
              "0 0 0 1px oklch(0.15 0.010 245)",
              "0 24px 48px oklch(0 0 0 / 0.5)",
              "0 0 24px oklch(0.73 0.19 62 / 0.04)",
            ].join(", "),
          }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input
              type="password"
              {...register("password")}
              placeholder="Admin password"
              className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              autoFocus
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
            <Button
              type="submit"
              className="w-full font-mono text-xs"
              style={{ letterSpacing: "0.08em" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Authenticating…" : "Sign In →"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
