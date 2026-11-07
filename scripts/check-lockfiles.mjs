import { globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function compareManifest(manifest, locked, label) {
  if (!locked) return [`${label}: missing package-lock entry`];
  const errors = [];
  for (const field of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    const wanted = manifest[field] ?? {};
    const actual = locked[field] ?? {};
    for (const name of new Set([...Object.keys(wanted), ...Object.keys(actual)])) {
      if (wanted[name] !== actual[name])
        errors.push(`${label}: ${field}.${name}: manifest=${wanted[name]} lock=${actual[name]}`);
    }
  }
  return errors;
}

export function checkLockfiles(root) {
  const read = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
  const manifest = read("package.json");
  const lock = read("package-lock.json");
  const errors = compareManifest(manifest, lock.packages[""], "root");
  for (const path of globSync(
    manifest.workspaces.map((pattern) => `${pattern}/package.json`),
    { cwd: root }
  )) {
    const workspace = path.replaceAll("\\", "/").replace(/\/package.json$/, "");
    errors.push(...compareManifest(read(path), lock.packages[workspace], workspace));
  }
  const functionsLock = read("backend/functions/package-lock.json");
  errors.push(
    ...compareManifest(
      read("backend/functions/package.json"),
      functionsLock.packages[""],
      "backend/functions"
    )
  );
  // npm can retain an incomplete cross-platform optional dependency graph.
  // These native tools must include every platform record, not just this host.
  for (const name of ["rollup", "esbuild", "@tailwindcss/oxide"]) {
    const parent = lock.packages[`node_modules/${name}`];
    if (!parent) {
      errors.push(`${name}: missing native tooling parent`);
      continue;
    }
    for (const [dependency, version] of Object.entries(parent.optionalDependencies ?? {})) {
      if (!/^@(rollup|esbuild|tailwindcss)\//.test(dependency)) continue;
      const entry = lock.packages[`node_modules/${dependency}`];
      if (entry?.version !== version)
        errors.push(`${name}: missing or mismatched optional package ${dependency}@${version}`);
    }
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkLockfiles(fileURLToPath(new URL("../", import.meta.url)));
  process.stdout.write(
    errors.length
      ? `${errors.join("\n")}\n`
      : "Root/workspace and Functions lockfiles match; native tooling metadata is complete.\n"
  );
  process.exitCode = errors.length ? 1 : 0;
}
