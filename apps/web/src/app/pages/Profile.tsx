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
        <p className="text-gray-500 mt-1">Your account identity and personal workspace overview</p>
      </div>

      <Card className="border-0 shadow-md bg-gradient-to-br from-white to-blue-50">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-semibold">
              {initialsFromName(user?.displayName, user?.email)}
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold">{fullName}</h2>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{email}</span>
              </div>
            </div>
            <div className="sm:ml-auto">
              <Badge className="bg-green-600 hover:bg-green-600">Authenticated</Badge>
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
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <CardTitle>Account & Security</CardTitle>
          </div>
          <CardDescription>
            This profile is derived from Firebase Authentication and your user-scoped PocketPilot data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 mt-0.5 text-gray-500" />
            <p>
              Full name is sourced from <span className="font-medium">Firebase display name</span> set at sign-up.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 mt-0.5 text-gray-500" />
            <p>
              Email is sourced from your authenticated account and used for sign-in.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 mt-0.5 text-gray-500" />
            <p>
              Insights and AI responses are scoped to your authenticated user data only.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
