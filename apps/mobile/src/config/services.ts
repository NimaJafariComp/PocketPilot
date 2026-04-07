import { createMobileServices } from '@pocketpilot/services/src/factory/mobile';
import { env } from '@/config/env';

const functionsBaseUrl = env.functionsBaseUrl.includes('127.0.0.1')
  ? env.functionsBaseUrl.replace('127.0.0.1', env.firebaseEmulatorHost)
  : env.functionsBaseUrl;

export const mobileServices = createMobileServices({
  firebaseConfig: {
    apiKey: env.firebaseApiKey,
    authDomain: env.firebaseAuthDomain,
    projectId: env.firebaseProjectId,
    appId: env.firebaseAppId,
  },
  useEmulators: env.useFirebaseEmulators,
  authEmulatorUrl: `http://${env.firebaseEmulatorHost}:9099`,
  firestoreEmulatorHost: env.firebaseEmulatorHost,
  firestoreEmulatorPort: 8080,
  functionsBaseUrl,
});
