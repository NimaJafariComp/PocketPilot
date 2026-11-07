import { createMobileServices } from "@pocketpilot/services/src/factory/mobile";
import { resolveCapabilities } from "@pocketpilot/services/src/capabilities";
import { validateClientReleaseConfig } from "@pocketpilot/services/src/release-config";
import { env } from "@/config/env";

const releaseProfile = env.releaseProfile ?? (__DEV__ ? "development" : "beta");
const capabilities = resolveCapabilities({
  profile: releaseProfile,
  flags: {
    aiAssistant: env.capabilityAiAssistant,
    ragSync: env.capabilityRagSync,
    remoteCategorization: env.capabilityRemoteCategorization,
    merchantLearning: env.capabilityMerchantLearning,
    demoDataTools: env.capabilityDemoDataTools,
    useEmulators: env.capabilityUseEmulators,
  },
});

const functionsBaseUrl = env.functionsBaseUrl.includes("127.0.0.1")
  ? env.functionsBaseUrl.replace("127.0.0.1", env.firebaseEmulatorHost)
  : env.functionsBaseUrl;
const categorizationServiceUrl = env.categorizationServiceUrl.includes("127.0.0.1")
  ? env.categorizationServiceUrl.replace("127.0.0.1", env.firebaseEmulatorHost)
  : env.categorizationServiceUrl;
const ragServiceUrl = env.ragServiceUrl.includes("127.0.0.1")
  ? env.ragServiceUrl.replace("127.0.0.1", env.firebaseEmulatorHost)
  : env.ragServiceUrl;

validateClientReleaseConfig({
  profile: releaseProfile,
  firebase: {
    apiKey: env.firebaseApiKey,
    authDomain: env.firebaseAuthDomain,
    projectId: env.firebaseProjectId,
    appId: env.firebaseAppId,
  },
  useEmulators: env.useFirebaseEmulators && capabilities.useEmulators,
  remoteFeaturesEnabled:
    capabilities.aiAssistant || capabilities.ragSync || capabilities.remoteCategorization,
  endpoints: {
    functions: functionsBaseUrl,
    categorization: categorizationServiceUrl,
    rag: ragServiceUrl,
  },
});

export const mobileServices = createMobileServices({
  firebaseConfig: {
    apiKey: env.firebaseApiKey,
    authDomain: env.firebaseAuthDomain,
    projectId: env.firebaseProjectId,
    appId: env.firebaseAppId,
  },
  useEmulators: env.useFirebaseEmulators && capabilities.useEmulators,
  authEmulatorUrl: `http://${env.firebaseEmulatorHost}:9099`,
  firestoreEmulatorHost: env.firebaseEmulatorHost,
  firestoreEmulatorPort: 8080,
  functionsBaseUrl,
  categorizationServiceUrl,
  ragServiceUrl,
  capabilities,
});
