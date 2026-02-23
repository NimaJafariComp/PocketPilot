import { createWebServices } from '@pocketpilot/services/src/factory/web';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pocketpilot-local.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pocketpilot-local',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:local',
};

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'false';
const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || window.location.hostname || '127.0.0.1';

const functionsBaseUrl =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  `http://${emulatorHost}:5001/pocketpilot-local/us-central1`;

export const services = createWebServices({
  firebaseConfig,
  useEmulators,
  authEmulatorUrl: `http://${emulatorHost}:9099`,
  firestoreEmulatorHost: emulatorHost,
  firestoreEmulatorPort: 8080,
  functionsBaseUrl,
});
