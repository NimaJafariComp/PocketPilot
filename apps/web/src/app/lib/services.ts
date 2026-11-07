import { createWebServices } from "@pocketpilot/services/src/factory/web";
import { resolveCapabilities } from "@pocketpilot/services/src/capabilities";
import { validateClientReleaseConfig } from "@pocketpilot/services/src/release-config";

const releaseProfile =
  import.meta.env.VITE_RELEASE_PROFILE || (import.meta.env.DEV ? "development" : "beta");
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (import.meta.env.DEV ? "demo-api-key" : ""),
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    (import.meta.env.DEV ? "demo-pocketpilot.firebaseapp.com" : ""),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (import.meta.env.DEV ? "demo-pocketpilot" : ""),
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (import.meta.env.DEV ? "1:000000000000:web:local" : ""),
};

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

const useEmulators = shouldUseFirebaseEmulators();
const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || "127.0.0.1";
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || "";
const appCheckEnforcementRequested = import.meta.env.VITE_FIREBASE_APPCHECK_ENFORCEMENT === "true";

const capabilities = resolveCapabilities({
  profile: releaseProfile,
  flags: {
    aiAssistant: import.meta.env.VITE_CAPABILITY_AI_ASSISTANT,
    ragSync: import.meta.env.VITE_CAPABILITY_RAG_SYNC,
    remoteCategorization: import.meta.env.VITE_CAPABILITY_REMOTE_CATEGORIZATION,
    merchantLearning: import.meta.env.VITE_CAPABILITY_MERCHANT_LEARNING,
    demoDataTools: import.meta.env.VITE_CAPABILITY_DEMO_DATA_TOOLS,
    useEmulators: import.meta.env.VITE_CAPABILITY_USE_EMULATORS,
  },
});
const functionsBaseUrl =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  (releaseProfile === "development"
    ? `http://${emulatorHost}:5001/pocketpilot-local/us-central1`
    : "");
const categorizationServiceUrl =
  import.meta.env.VITE_CATEGORIZATION_SERVICE_URL ||
  (releaseProfile === "development" ? `http://${emulatorHost}:8088` : "");
const ragServiceUrl =
  import.meta.env.VITE_RAG_SERVICE_URL ||
  (releaseProfile === "development" ? `http://${emulatorHost}:8089` : "");

validateClientReleaseConfig({
  profile: releaseProfile,
  firebase: firebaseConfig,
  useEmulators: useEmulators && capabilities.useEmulators,
  appCheckSiteKey,
  appCheckEnforcementRequested,
  remoteFeaturesEnabled:
    capabilities.aiAssistant || capabilities.ragSync || capabilities.remoteCategorization,
  endpoints: {
    functions: functionsBaseUrl,
    categorization: categorizationServiceUrl,
    rag: ragServiceUrl,
  },
});

export const services = createWebServices({
  firebaseConfig,
  useEmulators: useEmulators && capabilities.useEmulators,
  appCheckSiteKey: appCheckSiteKey || undefined,
  authEmulatorUrl: `http://${emulatorHost}:9099`,
  firestoreEmulatorHost: emulatorHost,
  firestoreEmulatorPort: 8080,
  functionsBaseUrl,
  categorizationServiceUrl,
  ragServiceUrl,
  capabilities,
});
