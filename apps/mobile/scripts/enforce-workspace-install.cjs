const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "../..");
const initCwd = path.resolve(process.env.INIT_CWD || process.cwd());

if (initCwd !== workspaceRoot) {
  console.error(`
[mobile install] Install dependencies from the repo root so npm workspaces can resolve the mobile app correctly.

Use:
  cd ${path.relative(process.cwd(), workspaceRoot) || "."}
  npm install

Avoid:
  npm --prefix apps/mobile install
  cd apps/mobile && npm install
`);
  process.exit(1);
}
