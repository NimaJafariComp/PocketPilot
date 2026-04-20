import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-pocketpilot.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-pocketpilot",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:local",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function shouldUseFirebaseEmulators() {
  const emulatorSetting = import.meta.env.VITE_USE_FIREBASE_EMULATORS;

  if (emulatorSetting === "true") {
    return true;
  }

  if (emulatorSetting === "false") {
    return false;
  }

  return isLocalHostname(window.location.hostname);
}

const shouldUseEmulators = shouldUseFirebaseEmulators();

if (shouldUseEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
