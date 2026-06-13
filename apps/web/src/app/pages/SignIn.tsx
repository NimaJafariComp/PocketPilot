import { Check } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ThemeToggle } from "../components/ThemeToggle";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";

export function SignIn() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/login-bg.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 bg-slate-950/60" />

      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </div>

      <div className="relative flex min-h-screen flex-col lg:flex-row">
        <div
          className="relative hidden flex-1 overflow-hidden border-r border-white/10 p-12 text-white lg:flex lg:flex-col lg:justify-between"
          style={{
            backgroundColor: "var(--auth-panel-end)",
            backgroundImage:
              "radial-gradient(circle at top left, var(--auth-panel-glow), transparent 34%), linear-gradient(145deg, var(--auth-panel-start), var(--auth-panel-end))",
          }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-white/20" />

          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="PocketPilot" className="h-10 w-10 rounded-xl object-cover shadow-lg shadow-black/20" />
            <span className="font-semibold text-xl">PocketPilot</span>
          </div>

          <div>
            <h1 className="text-4xl font-bold mb-6">Own your financial control. Own your data.</h1>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium">Import & categorize transactions</p>
                  <p className="text-sm text-white/72">
                    Upload CSV files and automatically organize your spending
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium">Set budgets & track goals</p>
                  <p className="text-sm text-white/72">
                    Create monthly budgets and savings goals with progress tracking
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium">AI-powered insights</p>
                  <p className="text-sm text-white/72">
                    Get personalized spending insights and trend analysis
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <p className="text-sm text-white/72">© 2026 PocketPilot. All rights reserved.</p>
        </div>

        <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
          <Card className="w-full max-w-md border-border/70 bg-background/80 shadow-none backdrop-blur lg:shadow-xl lg:shadow-black/5">
            <CardHeader className="space-y-1">
              <div className="mb-4 flex items-center gap-2 lg:hidden">
                <img src="/logo.svg" alt="PocketPilot" className="h-8 w-8 rounded-lg object-cover" />
                <span className="text-lg font-semibold">PocketPilot</span>
              </div>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your account to continue</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
