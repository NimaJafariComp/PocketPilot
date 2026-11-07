import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run this script using npm run baseline.");
const options = process.argv.slice(2);
if (options.some((option) => option !== "--install"))
  throw new Error("Only --install is supported.");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const npmVersion = spawnSync(process.execPath, [npm, "--version"], {
  encoding: "utf8",
}).stdout?.trim();
if (process.versions.node !== manifest.engines.node || npmVersion !== manifest.engines.npm) {
  throw new Error(
    `Required Node ${manifest.engines.node}/npm ${manifest.engines.npm}; found ${process.versions.node}/${npmVersion}.`
  );
}
const directory = join(root, "work", "baseline");
mkdirSync(directory, { recursive: true });
const output = mkdtempSync(join(directory, "run-"));
const checks = [
  ...(options.includes("--install") ? [["install", [npm, "ci", "--no-audit", "--no-fund"]]] : []),
  ...[
    "check:lockfiles",
    "test:unit",
    "typecheck:web",
    "typecheck:core",
    "typecheck:services",
    "typecheck:mobile",
    "web:build",
    "lint",
    "format:check",
  ].map((name) => [name, [npm, "run", name]]),
  ["mobile-runtime", ["apps/mobile/scripts/verify-runtime-deps.cjs"]],
];
const hash = () =>
  createHash("sha256")
    .update(readFileSync(join(root, "package-lock.json")))
    .digest("hex");
const summary = {
  startedAt: new Date().toISOString(),
  node: process.versions.node,
  npm: npmVersion,
  platform: process.platform,
  architecture: process.arch,
  lockHashBefore: hash(),
  results: [],
};
for (const [name, args] of checks) {
  process.stdout.write(`Running ${name}...\n`);
  const started = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 600000,
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, CI: "true", NO_COLOR: "1" },
  });
  const log = `${name.replaceAll(":", "-")}.log`;
  writeFileSync(
    join(output, log),
    `${result.stdout ?? ""}\n${result.stderr ?? ""}\n${result.error?.message ?? ""}`
  );
  const passed = result.status === 0 && !result.error;
  summary.results.push({
    name,
    command: [process.execPath, ...args],
    passed,
    exitCode: result.status,
    signal: result.signal,
    durationMs: Date.now() - started,
    log,
  });
  process.stdout.write(`${name}: ${passed ? "PASS" : "FAIL"} (exit ${result.status})\n`);
}
summary.lockHashAfter = hash();
summary.lockUnchanged = summary.lockHashBefore === summary.lockHashAfter;
summary.completedAt = new Date().toISOString();
writeFileSync(join(output, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`Evidence: ${output}\n`);
process.exitCode =
  summary.lockUnchanged && summary.results.every((result) => result.passed) ? 0 : 1;
