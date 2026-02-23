export interface AuthUser {
  id: string;
  email?: string | null;
  displayName?: string | null;
}

export interface AuthAdapter {
  getCurrentUser(): Promise<AuthUser | null>;
  onAuthStateChanged(cb: (user: AuthUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, displayName?: string): Promise<void>;
  signOut(): Promise<void>;
  getIdToken(): Promise<string | null>;
}
