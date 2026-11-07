import { describe, expect, it } from "vitest";
import { validateClientReleaseConfig } from "./release-config";

const firebase = {
  apiKey: "public-api-key",
  authDomain: "project.firebaseapp.com",
  projectId: "project",
  appId: "1:123:web:abc",
};

describe("client release configuration", () => {
  it("rejects missing Firebase identifiers in beta/release mode", () => {
    expect(() =>
      validateClientReleaseConfig({ profile: "beta", firebase: { ...firebase, projectId: "" } })
    ).toThrow("Firebase configuration is required");
  });

  it("rejects emulators outside explicit development", () => {
    expect(() =>
      validateClientReleaseConfig({ profile: "beta", firebase, useEmulators: true })
    ).toThrow("Emulators are allowed only in the development profile");
  });

  it("requires explicit HTTPS endpoints when future remote features are enabled", () => {
    expect(() =>
      validateClientReleaseConfig({
        profile: "future",
        firebase,
        remoteFeaturesEnabled: true,
        endpoints: { functions: "http://example.test" },
      })
    ).toThrow("must use HTTPS");
  });

  it("requires a non-debug App Check site key before enforcement", () => {
    expect(() =>
      validateClientReleaseConfig({
        profile: "beta",
        firebase,
        appCheckEnforcementRequested: true,
      })
    ).toThrow("App Check site key is required before enforcement");

    expect(() =>
      validateClientReleaseConfig({
        profile: "beta",
        firebase,
        appCheckSiteKey: "debug-token",
        appCheckEnforcementRequested: true,
      })
    ).toThrow("App Check debug tokens are forbidden");
  });
});
