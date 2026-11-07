import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");

describe("invite-only client entry points", () => {
  it("does not expose a web sign-up route or call-to-action", () => {
    const routes = read("apps/web/src/app/routes.tsx");
    const signIn = read("apps/web/src/app/pages/SignIn.tsx");

    expect(routes).not.toMatch(/path:\s*["']signup["']/);
    expect(signIn).not.toContain('to="/signup"');
    expect(signIn).toContain("Accounts are provisioned by invitation");
  });

  it("does not expose mobile sign-up UI", () => {
    const signIn = read("apps/mobile/app/(auth)/signin.tsx");
    const signUpRoute = read("apps/mobile/app/(auth)/signup.tsx");

    expect(signIn).not.toContain("/(auth)/signup");
    expect(signIn).toContain("Accounts are provisioned by invitation");
    expect(signUpRoute).toContain('Redirect href="/(auth)/signin"');
  });
});
