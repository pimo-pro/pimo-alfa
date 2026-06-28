/**
 * Aplica ficheiros SQL em supabase/migrations via conexão Postgres directa.
 * Requer DATABASE_URL ou SUPABASE_DB_PASSWORD + VITE_SUPABASE_URL.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");

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

function resolveDatabaseUrl(env) {
  if (env.DATABASE_URL?.trim()) return env.DATABASE_URL.trim();
  const password = env.SUPABASE_DB_PASSWORD?.trim();
  const ref =
    env.SUPABASE_PROJECT_REF?.trim() ||
    projectRefFromUrl(env.VITE_SUPABASE_URL) ||
    projectRefFromUrl(env.SUPABASE_URL);
  const host = env.SUPABASE_DB_HOST?.trim() || `db.${ref}.supabase.co`;
  if (password && ref) {
    const user = env.SUPABASE_DB_USER?.trim() || "postgres";
    const port = env.SUPABASE_DB_PORT?.trim() || "5432";
    const db = env.SUPABASE_DB_NAME?.trim() || "postgres";
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`;
  }
  return "";
}

const env = {
  ...loadEnvFile(path.join(root, ".env")),
  ...loadEnvFile(path.join(root, ".env.production")),
  ...process.env,
};

const databaseUrl = resolveDatabaseUrl(env);
if (!databaseUrl) {
  console.error(
    "ERRO: configure DATABASE_URL ou SUPABASE_DB_PASSWORD + VITE_SUPABASE_URL.",
  );
  process.exit(1);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Aplicar ${files.length} migrations...`);

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public._pimo_schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  for (const file of files) {
    const { rows } = await client.query(
      "SELECT 1 FROM public._pimo_schema_migrations WHERE filename = $1",
      [file],
    );
    if (rows.length > 0) {
      console.log(`SKIP ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`APPLY ${file}`);
    await client.query(sql);
    await client.query(
      "INSERT INTO public._pimo_schema_migrations (filename) VALUES ($1)",
      [file],
    );
  }

  const tables = [
    "industrial_work_orders",
    "industrial_work_order_tasks",
    "industrial_work_order_events",
    "industrial_piece_operations",
    "industrial_piece_quality",
    "industrial_piece_time_entries",
    "system_settings",
    "system_events",
  ];

  for (const table of tables) {
    const check = await client.query(
      `SELECT to_regclass($1) AS reg`,
      [`public.${table}`],
    );
    if (!check.rows[0]?.reg) {
      throw new Error(`Tabela em falta após migrations: ${table}`);
    }
    console.log(`OK table ${table}`);
  }
} finally {
  await client.end();
}

console.log("Migrations concluídas.");
