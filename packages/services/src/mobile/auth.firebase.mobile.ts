import type { AuthAdapter } from '../interfaces/auth';

export const authFirebaseMobile: AuthAdapter = {
  async getCurrentUser() {
    throw new Error('Not wired: authFirebaseMobile.getCurrentUser');
  },
  onAuthStateChanged() {
    throw new Error('Not wired: authFirebaseMobile.onAuthStateChanged');
  },
  async signIn() {
    throw new Error('Not wired: authFirebaseMobile.signIn');
  },
  async signUp() {
    throw new Error('Not wired: authFirebaseMobile.signUp');
  },
  async signOut() {
    throw new Error('Not wired: authFirebaseMobile.signOut');
  },
  async getIdToken() {
    throw new Error('Not wired: authFirebaseMobile.getIdToken');
  }
};
