import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  reload,
  updateProfile,
  type Auth,
} from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import type { AuthAdapter } from '../interfaces/auth';

function toFriendlyAuthError(error: unknown, fallback: string): Error {
  const code = typeof error === 'object' && error !== null && 'code' in error ? (error as FirebaseError).code : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return new Error('Incorrect email or password.');
    case 'auth/invalid-email':
      return new Error('Enter a valid email address.');
    case 'auth/email-already-in-use':
      return new Error('An account with this email already exists.');
    case 'auth/weak-password':
      return new Error('Choose a stronger password.');
    case 'auth/too-many-requests':
      return new Error('Too many attempts. Please wait a moment and try again.');
    case 'auth/network-request-failed':
      return new Error('Unable to reach the server. Check your connection and try again.');
    default:
      return new Error(fallback);
  }
}

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
        throw toFriendlyAuthError(error, 'Unable to sign in right now.');
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
        throw toFriendlyAuthError(error, 'Unable to create your account right now.');
      }
    },
    async signOut() {
      try {
        await signOut(auth);
      } catch (error) {
        throw toFriendlyAuthError(error, 'Unable to sign out right now.');
      }
    },
    async getIdToken() {
      const user = auth.currentUser;
      if (!user) return null;
      return user.getIdToken();
    },
  };
}
