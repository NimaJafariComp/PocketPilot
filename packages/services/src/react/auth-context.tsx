import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthUser } from "../interfaces/auth";
import { useServices } from "./services-provider";

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  access: "checking" | "active" | "not-invited" | "revoked" | "unavailable";
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const services = useServices();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<AuthContextValue["access"]>("checking");

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = services.auth.onAuthStateChanged((nextUser) => {
      if (!isMounted) {
        return;
      }

      setUser(nextUser);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [services]);

  useEffect(() => {
    let isCurrent = true;
    if (!user) {
      setAccess("checking");
      return () => {
        isCurrent = false;
      };
    }

    setAccess("checking");
    void services.dataStore
      .getMembershipStatus(user.id)
      .then((status) => {
        if (isCurrent) setAccess(status);
      })
      .catch(() => {
        if (isCurrent) setAccess("unavailable");
      });

    return () => {
      isCurrent = false;
    };
  }, [services, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      access,
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
        setAccess("checking");
      },
    }),
    [access, loading, services, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
