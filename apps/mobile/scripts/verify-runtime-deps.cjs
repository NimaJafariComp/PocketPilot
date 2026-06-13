const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");

function fail(message) {
  console.error(`\n[mobile deps] ${message}\n`);
  process.exit(1);
}

function resolveLocalPackageJson(name) {
  return require.resolve(`${name}/package.json`, {
    paths: [path.join(projectRoot, "node_modules"), path.join(repoRoot, "node_modules")],
  });
}

function requireLocalPackageJson(name) {
  return require(resolveLocalPackageJson(name));
}

function ensureLocalPackage(name) {
  try {
    return requireLocalPackageJson(name);
  } catch {
    fail(`Missing local dependency "${name}" in apps/mobile. Run "npm install" at the repo root.`);
  }
}

const tailwindPackage = ensureLocalPackage("tailwindcss");
const tailwindMajorVersion = Number.parseInt(
  String(tailwindPackage.version).split(".")[0] || "0",
  10
);

if (tailwindMajorVersion !== 3) {
  fail(
    `apps/mobile resolved tailwindcss@${tailwindPackage.version}, but NativeWind requires v3 here. Run "npm install" at the repo root.`
  );
}

const tailwindPackagePath = resolveLocalPackageJson("tailwindcss");
const mobileNodeModules = path.join(projectRoot, "node_modules");
const repoNodeModules = path.join(repoRoot, "node_modules");

if (
  !tailwindPackagePath.startsWith(mobileNodeModules) &&
  !tailwindPackagePath.startsWith(repoNodeModules)
) {
  fail(
    `apps/mobile resolved tailwindcss from "${tailwindPackagePath}" outside the workspace node_modules. Run "npm install" at the repo root.`
  );
}
