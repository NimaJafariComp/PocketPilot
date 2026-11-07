export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export interface ClientReleaseConfig {
  profile: string;
  firebase: FirebaseClientConfig;
  useEmulators?: boolean;
  /** Public reCAPTCHA Enterprise site key; never a debug token. */
  appCheckSiteKey?: string;
  /** Mirrors the console rollout decision; enforcement is never implicit. */
  appCheckEnforcementRequested?: boolean;
  remoteFeaturesEnabled?: boolean;
  endpoints?: Record<string, string | undefined>;
}

export function validateClientReleaseConfig(config: ClientReleaseConfig) {
  const missingFirebase = Object.entries(config.firebase)
    .filter(([, value]) => !value.trim() || value.startsWith("demo-"))
    .map(([key]) => key);
  if (config.profile !== "development" && missingFirebase.length > 0) {
    throw new Error(`Firebase configuration is required for release: ${missingFirebase.join(", ")}`);
  }
  if (config.profile !== "development" && config.useEmulators) {
    throw new Error("Emulators are allowed only in the development profile");
  }
  if (/debug/i.test(config.appCheckSiteKey ?? "")) {
    throw new Error("App Check debug tokens are forbidden");
  }
  if (config.appCheckEnforcementRequested && !config.appCheckSiteKey?.trim()) {
    throw new Error("App Check site key is required before enforcement");
  }
  if (config.profile === "future" && config.remoteFeaturesEnabled) {
    for (const [name, endpoint] of Object.entries(config.endpoints ?? {})) {
      if (!endpoint) throw new Error(`${name} endpoint is required for enabled remote features`);
      if (!endpoint.startsWith("https://")) throw new Error(`${name} endpoint must use HTTPS`);
    }
  }
}
