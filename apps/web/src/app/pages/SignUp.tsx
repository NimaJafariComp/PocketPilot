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

export function SignUp() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await signUp(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </div>

      <div className="flex min-h-screen flex-col lg:flex-row">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <Wallet className="h-6 w-6" />
            </div>
            <span className="text-xl font-semibold">PocketPilot</span>
          </div>

          <div>
            <h1 className="mb-6 text-4xl font-bold">Build better money habits from day one</h1>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Start with a clean financial workspace</p>
                  <p className="text-sm text-white/72">
                    Create your account and keep transactions, budgets, and goals in one place.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">See progress earlier</p>
                  <p className="text-sm text-white/72">
                    Set budgets and savings targets right away so your dashboard tells a fuller
                    story.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Grow into AI-powered guidance</p>
                  <p className="text-sm text-white/72">
                    As your data builds up, PocketPilot can surface trends, categories, and insights
                    automatically.
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
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-info to-primary text-primary-foreground">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-semibold">PocketPilot</span>
              </div>
              <CardTitle className="text-2xl">Create an account</CardTitle>
              <CardDescription>
                Start managing your finances with a calmer, clearer setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
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
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link to="/signin" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
