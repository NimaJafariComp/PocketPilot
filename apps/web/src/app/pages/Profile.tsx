import { User, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

function initialsFromName(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
    return initials.join('');
  }
  if (email?.trim()) {
    return email.charAt(0).toUpperCase();
  }
  return 'U';
}

export function Profile() {
  const { user } = useAuth();
  const { transactions, budgets, goals } = useData();

  const fullName = user?.displayName?.trim() || 'No name set';
  const email = user?.email?.trim() || 'No email available';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="mt-1 text-muted-foreground">Your account identity and personal workspace overview</p>
      </div>

      <Card className="border-primary/15 bg-gradient-to-br from-card via-card to-primary/10 shadow-[0_22px_50px_-36px_rgba(43,103,246,0.45)]">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-info text-xl font-semibold text-primary-foreground">
              {initialsFromName(user?.displayName, user?.email)}
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold">{fullName}</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{email}</span>
              </div>
            </div>
            <div className="sm:ml-auto">
              <Badge variant="outline" className="border-success/20 bg-success text-success-foreground hover:bg-success">
                Authenticated
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Transactions</CardDescription>
            <CardTitle className="text-3xl">{transactions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Budgets</CardDescription>
            <CardTitle className="text-3xl">{budgets.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Goals</CardDescription>
            <CardTitle className="text-3xl">{goals.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <CardTitle>Account & Security</CardTitle>
          </div>
          <CardDescription>
            This profile is derived from Firebase Authentication and your user-scoped PocketPilot data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <User className="mt-0.5 w-4 h-4 text-muted-foreground" />
            <p>
              Full name is sourced from <span className="font-medium">Firebase display name</span> set at sign-up.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 w-4 h-4 text-muted-foreground" />
            <p>
              Email is sourced from your authenticated account and used for sign-in.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 w-4 h-4 text-muted-foreground" />
            <p>
              Insights and AI responses are scoped to your authenticated user data only.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
