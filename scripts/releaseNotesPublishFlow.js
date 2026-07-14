// pimo-kep-fix-003 — protegido, não modificar sem autorização

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const flow = process.argv[2] === "deploy" ? "deploy" : "publish";

const result = spawnSync(process.execPath, [path.join(__dirname, "publish.js")], {
  cwd: rootDir,
  stdio: "inherit",
  env: { ...process.env, PIMO_PUBLISH_FLOW: flow },
});

process.exit(result.status ?? 1);
