import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { AuthUser } from '../interfaces/auth';
import { useServices } from './services-provider';

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const services = useServices();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let hasResolvedInitialState = false;

    const unsubscribe = services.auth.onAuthStateChanged((nextUser) => {
      if (!isMounted) {
        return;
      }

      hasResolvedInitialState = true;
      setUser(nextUser);
      setLoading(false);
    });

    void services.auth.getCurrentUser().then((currentUser) => {
      if (!isMounted || hasResolvedInitialState) {
        return;
      }

      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [services]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signIn(email: string, password: string) {
        await services.auth.signIn(email, password);
        const refreshedUser = await services.auth.getCurrentUser();
        setUser(refreshedUser);
      },
      async signUp(name: string, email: string, password: string) {
        await services.auth.signUp(email, password, name);
        const refreshedUser = await services.auth.getCurrentUser();
        setUser(refreshedUser);
      },
      async signOut() {
        await services.auth.signOut();
        setUser(null);
      },
    }),
    [loading, services, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
