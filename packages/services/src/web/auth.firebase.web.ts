import {
  type Auth,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import type { AuthAdapter } from "../interfaces/auth";
import { toFriendlyAuthError } from "../shared/auth-error";

export function createAuthFirebaseWeb(auth: Auth): AuthAdapter {
  return {
    async getCurrentUser() {
      const user = auth.currentUser;
      if (!user) return null;
      return { id: user.uid, email: user.email, displayName: user.displayName };
    },
    onAuthStateChanged(cb) {
      return onAuthStateChanged(auth, (user) => {
        cb(user ? { id: user.uid, email: user.email, displayName: user.displayName } : null);
      });
    },
    async signIn(email: string, password: string) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        throw toFriendlyAuthError(error, "Unable to sign in right now.");
      }
    },
    async signUp(email: string, password: string, displayName?: string) {
      try {
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName?.trim()) {
          await updateProfile(credentials.user, { displayName: displayName.trim() });
          await reload(credentials.user);
        }
      } catch (error) {
        throw toFriendlyAuthError(error, "Unable to create your account right now.");
      }
    },
    async signOut() {
      try {
        await signOut(auth);
      } catch (error) {
        throw toFriendlyAuthError(error, "Unable to sign out right now.");
      }
    },
    async getIdToken() {
      const user = auth.currentUser;
      if (!user) return null;
      return user.getIdToken();
    },
  };
}
