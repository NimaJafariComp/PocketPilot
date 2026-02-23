import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  reload,
  updateProfile,
  type Auth,
} from 'firebase/auth';
import type { AuthAdapter } from '../interfaces/auth';

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
      await signInWithEmailAndPassword(auth, email, password);
    },
    async signUp(email: string, password: string, displayName?: string) {
      const credentials = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName?.trim()) {
        await updateProfile(credentials.user, { displayName: displayName.trim() });
        await reload(credentials.user);
      }
    },
    async signOut() {
      await signOut(auth);
    },
    async getIdToken() {
      const user = auth.currentUser;
      if (!user) return null;
      return user.getIdToken();
    },
  };
}
