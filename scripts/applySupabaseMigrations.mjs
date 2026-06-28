/**
 * Aplica migrations em supabase/migrations ao projecto remoto ligado.
 * Requer: SUPABASE_ACCESS_TOKEN e VITE_SUPABASE_URL (ou SUPABASE_PROJECT_REF).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

function projectRefFromUrl(url) {
  const match = String(url).match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match?.[1] ?? "";
}

const env = {
  ...loadEnvFile(path.join(root, ".env")),
  ...loadEnvFile(path.join(root, ".env.production")),
  ...process.env,
};

const accessToken = env.SUPABASE_ACCESS_TOKEN?.trim();
const projectRef =
  env.SUPABASE_PROJECT_REF?.trim() ||
  projectRefFromUrl(env.VITE_SUPABASE_URL) ||
  projectRefFromUrl(env.SUPABASE_URL);

if (!accessToken) {
  console.error("ERRO: SUPABASE_ACCESS_TOKEN em falta.");
  process.exit(1);
}
if (!projectRef) {
  console.error("ERRO: project ref em falta (VITE_SUPABASE_URL ou SUPABASE_PROJECT_REF).");
  process.exit(1);
}

const migrationsDir = path.join(root, "supabase", "migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Migrations encontradas: ${files.length}`);
for (const file of files) {
  console.log(`  - ${file}`);
}

const childEnv = {
  ...process.env,
  SUPABASE_ACCESS_TOKEN: accessToken,
};

console.log(`\nA ligar projecto ${projectRef} e aplicar migrations...`);

execSync(`npx supabase link --project-ref ${projectRef} --yes`, {
  cwd: root,
  stdio: "inherit",
  env: childEnv,
});

execSync("npx supabase db push --yes", {
  cwd: root,
  stdio: "inherit",
  env: childEnv,
});

console.log("\nMigrations aplicadas com sucesso.");
