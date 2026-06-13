import type { FirebaseError } from "firebase/app";

export function toFriendlyAuthError(error: unknown, fallback: string): Error {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as FirebaseError).code
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return new Error("Incorrect email or password.");
    case "auth/invalid-email":
      return new Error("Enter a valid email address.");
    case "auth/email-already-in-use":
      return new Error("An account with this email already exists.");
    case "auth/weak-password":
      return new Error("Choose a stronger password.");
    case "auth/too-many-requests":
      return new Error("Too many attempts. Please wait a moment and try again.");
    case "auth/network-request-failed":
      return new Error("Unable to reach the server. Check your connection and try again.");
    default:
      return new Error(fallback);
  }
}
