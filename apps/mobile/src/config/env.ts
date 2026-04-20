import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};
const expoHostUri =
  Constants.expoConfig?.hostUri ??
  Constants.expoGoConfig?.debuggerHost ??
  Constants.manifest2?.extra?.expoClient?.hostUri ??
  '';

function extractHost(hostUri: string) {
  return hostUri.split(':')[0]?.trim() ?? '';
}

const derivedExpoHost = extractHost(expoHostUri);
const rawFirebaseEmulatorHost =
  process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ??
  (extra.firebaseEmulatorHost as string | undefined) ??
  '127.0.0.1';
const firebaseEmulatorHost =
  rawFirebaseEmulatorHost === '127.0.0.1' && derivedExpoHost ? derivedExpoHost : rawFirebaseEmulatorHost;
const rawFunctionsBaseUrl =
  process.env.EXPO_PUBLIC_FUNCTIONS_BASE_URL ??
  (extra.functionsBaseUrl as string | undefined) ??
  'http://127.0.0.1:5001/demo-pocketpilot/us-central1';
const functionsBaseUrl =
  rawFunctionsBaseUrl.includes('127.0.0.1') && derivedExpoHost
    ? rawFunctionsBaseUrl.replace('127.0.0.1', derivedExpoHost)
    : rawFunctionsBaseUrl;
const rawCategorizationServiceUrl =
  process.env.EXPO_PUBLIC_CATEGORIZATION_SERVICE_URL ??
  (extra.categorizationServiceUrl as string | undefined) ??
  'http://127.0.0.1:8088';
const categorizationServiceUrl =
  rawCategorizationServiceUrl.includes('127.0.0.1') && derivedExpoHost
    ? rawCategorizationServiceUrl.replace('127.0.0.1', derivedExpoHost)
    : rawCategorizationServiceUrl;
const rawRagServiceUrl =
  process.env.EXPO_PUBLIC_RAG_SERVICE_URL ??
  (extra.ragServiceUrl as string | undefined) ??
  'http://127.0.0.1:8089';
const ragServiceUrl =
  rawRagServiceUrl.includes('127.0.0.1') && derivedExpoHost
    ? rawRagServiceUrl.replace('127.0.0.1', derivedExpoHost)
    : rawRagServiceUrl;

export const env = {
  appName: Constants.expoConfig?.name ?? 'PocketPilot',
  firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? (extra.firebaseApiKey as string | undefined) ?? 'demo-api-key',
  firebaseAuthDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    (extra.firebaseAuthDomain as string | undefined) ??
    'demo-pocketpilot.firebaseapp.com',
  firebaseProjectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? (extra.firebaseProjectId as string | undefined) ?? 'demo-pocketpilot',
  firebaseAppId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ??
    (extra.firebaseAppId as string | undefined) ??
    '1:000000000000:ios:local',
  useFirebaseEmulators:
    (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS ?? (extra.useFirebaseEmulators as string | undefined) ?? 'true') !==
    'false',
  firebaseEmulatorHost,
  functionsBaseUrl,
  categorizationServiceUrl,
  ragServiceUrl,
};
