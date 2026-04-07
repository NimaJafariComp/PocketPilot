import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'PocketPilot',
  slug: 'pocketpilot-mobile',
  scheme: 'pocketpilot',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  assetBundlePatterns: ['**/*'],
  experiments: {
    typedRoutes: true,
  },
  plugins: ['expo-router'],
  extra: {
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    functionsBaseUrl: process.env.EXPO_PUBLIC_FUNCTIONS_BASE_URL,
    useFirebaseEmulators: process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS,
    firebaseEmulatorHost: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.pocketpilot.mobile',
  },
  android: {
    package: 'com.pocketpilot.mobile',
    adaptiveIcon: {
      backgroundColor: '#0B1730',
    },
  },
};

export default config;
