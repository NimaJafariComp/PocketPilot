import { createWebServices } from '@pocketpilot/services/src/factory/web';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-pocketpilot.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-pocketpilot',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:local',
};

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function shouldUseFirebaseEmulators() {
  const emulatorSetting = import.meta.env.VITE_USE_FIREBASE_EMULATORS;

  if (emulatorSetting === 'true') {
    return true;
  }

  if (emulatorSetting === 'false') {
    return false;
  }

  return isLocalHostname(window.location.hostname);
}

const useEmulators = shouldUseFirebaseEmulators();
const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1';

const functionsBaseUrl =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  `http://${emulatorHost}:5001/demo-pocketpilot/us-central1`;
const categorizationServiceUrl =
  import.meta.env.VITE_CATEGORIZATION_SERVICE_URL ||
  `http://${emulatorHost}:8088`;
const ragServiceUrl =
  import.meta.env.VITE_RAG_SERVICE_URL ||
  `http://${emulatorHost}:8089`;

export const services = createWebServices({
  firebaseConfig,
  useEmulators,
  authEmulatorUrl: `http://${emulatorHost}:9099`,
  firestoreEmulatorHost: emulatorHost,
  firestoreEmulatorPort: 8080,
  functionsBaseUrl,
  categorizationServiceUrl,
  ragServiceUrl,
});
