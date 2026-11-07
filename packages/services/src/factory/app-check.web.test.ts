import type { FirebaseApp } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";

const appCheckMocks = vi.hoisted(() => ({
  getToken: vi.fn(() => Promise.resolve({ token: "attested", expireTimeMillis: 1 })),
  initializeAppCheck: vi.fn(() => ({ appCheck: true })),
  ReCaptchaEnterpriseProvider: vi.fn(),
}));

vi.mock("firebase/app-check", () => ({
  getToken: appCheckMocks.getToken,
  initializeAppCheck: appCheckMocks.initializeAppCheck,
  ReCaptchaEnterpriseProvider: appCheckMocks.ReCaptchaEnterpriseProvider,
}));

import { initializeWebAppCheck } from "./app-check.web";

describe("initializeWebAppCheck", () => {
  const app = { name: "[DEFAULT]" } as FirebaseApp;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests an App Check token immediately for a configured hosted app", async () => {
    initializeWebAppCheck({ app, siteKey: "enterprise-site-key", useEmulators: false });

    await vi.waitFor(() => expect(appCheckMocks.getToken).toHaveBeenCalledOnce());
    expect(appCheckMocks.initializeAppCheck).toHaveBeenCalledOnce();
    expect(appCheckMocks.ReCaptchaEnterpriseProvider).toHaveBeenCalledWith("enterprise-site-key");
  });

  it("does not initialize or request a token for emulators or a missing key", async () => {
    initializeWebAppCheck({ app, siteKey: "enterprise-site-key", useEmulators: true });
    initializeWebAppCheck({ app, useEmulators: false });

    await Promise.resolve();
    expect(appCheckMocks.initializeAppCheck).not.toHaveBeenCalled();
    expect(appCheckMocks.getToken).not.toHaveBeenCalled();
  });

  it("reports a token-request failure without preventing monitoring-mode startup", async () => {
    const failure = new Error("attestation unavailable");
    appCheckMocks.getToken.mockRejectedValueOnce(failure);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    initializeWebAppCheck({ app: { name: "failure" } as FirebaseApp, siteKey: "enterprise-site-key" });

    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith("PocketPilot App Check token request failed", failure));
    warn.mockRestore();
  });
});
