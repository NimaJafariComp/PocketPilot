import type { FirebaseApp } from "firebase/app";
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

export interface WebAppCheckConfig {
  app: FirebaseApp;
  siteKey?: string;
  useEmulators?: boolean;
}

const appCheckInitializedApps = new Set<string>();

export function initializeWebAppCheck({ app, siteKey, useEmulators }: WebAppCheckConfig) {
  if (!siteKey || useEmulators || appCheckInitializedApps.has(app.name)) {
    return;
  }

  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  appCheckInitializedApps.add(app.name);

  // Request the initial token now, before the first Firestore/Auth operation.
  // Monitoring-only mode must remain usable if attestation is temporarily unavailable.
  void getToken(appCheck).catch((error) => {
    // Keep monitoring mode available while exposing an actionable browser-side diagnostic.
    console.warn("PocketPilot App Check token request failed", error);
  });
}
