import { describe, expect, it } from "vitest";
import { compareManifest } from "./check-lockfiles.mjs";

describe("manifest and lockfile consistency", () => {
  it("accepts matching declarations regardless of key ordering", () => {
    expect(
      compareManifest(
        { dependencies: { first: "1.0.0", second: "^2.0.0" } },
        { dependencies: { second: "^2.0.0", first: "1.0.0" } },
        "workspace"
      )
    ).toEqual([]);
  });

  it("reports changed, missing, and removed dependencies", () => {
    const errors = compareManifest(
      { dependencies: { changed: "2", added: "1" } },
      { dependencies: { changed: "1", removed: "1" } },
      "workspace"
    );
    expect(errors).toHaveLength(3);
    expect(errors.join("\n")).toContain("dependencies.changed");
    expect(errors.join("\n")).toContain("dependencies.added");
    expect(errors.join("\n")).toContain("dependencies.removed");
  });

  it("checks optional and peer dependencies as well as development dependencies", () => {
    expect(
      compareManifest(
        { optionalDependencies: { native: "1" }, peerDependencies: { react: "18" } },
        { devDependencies: { obsolete: "1" } },
        "workspace"
      )
    ).toHaveLength(3);
  });

  it("fails when a workspace is absent from the lockfile", () => {
    expect(compareManifest({}, undefined, "apps/new")).toEqual([
      "apps/new: missing package-lock entry",
    ]);
  });
});
