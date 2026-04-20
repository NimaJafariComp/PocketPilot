const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`\n[mobile deps] ${message}\n`);
  process.exit(1);
}

function resolveLocalPackageJson(name) {
  return require.resolve(`${name}/package.json`, {
    paths: [path.join(projectRoot, 'node_modules')],
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

const tailwindPackage = ensureLocalPackage('tailwindcss');
const tailwindMajorVersion = Number.parseInt(String(tailwindPackage.version).split('.')[0] || '0', 10);

if (tailwindMajorVersion !== 3) {
  fail(
    `apps/mobile resolved tailwindcss@${tailwindPackage.version}, but NativeWind requires v3 here. Run "npm install" at the repo root.`,
  );
}

const tailwindPackagePath = resolveLocalPackageJson('tailwindcss');

if (!tailwindPackagePath.startsWith(path.join(projectRoot, 'node_modules'))) {
  fail(
    `apps/mobile resolved tailwindcss from "${tailwindPackagePath}" instead of apps/mobile/node_modules. Run "npm install" at the repo root.`,
  );
}
