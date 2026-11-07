import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobile = createRequire(resolve("apps/mobile/package.json"));
const services = createRequire(resolve("packages/services/package.json"));
const manifest = JSON.parse(readFileSync("apps/mobile/package.json", "utf8"));
const bundled = mobile("expo/bundledNativeModules.json");
const semver = mobile("semver");
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));

describe("Expo native dependency boundary", () => {
  it.each([
    "react",
    "react-native",
    "@react-native-async-storage/async-storage",
    "expo-file-system",
    "expo-document-picker",
    "expo-sharing",
    "react-native-worklets",
  ])("declares and resolves one compatible %s for app and services", (name) => {
    expect(manifest.dependencies[name], `${name} must be owned by the native app`).toBeDefined();
    expect(services.resolve(`${name}/package.json`)).toBe(mobile.resolve(`${name}/package.json`));
    expect(semver.satisfies(mobile(`${name}/package.json`).version, bundled[name])).toBe(true);
    if (name !== "react") {
      const copies = Object.keys(lock.packages).filter((path) =>
        path.endsWith(`node_modules/${name}`)
      );
      expect(copies, `${name} must not have hidden transitive native copies`).toHaveLength(1);
    }
  });
});
