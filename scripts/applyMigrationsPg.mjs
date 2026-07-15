/**
 * Aplica ficheiros SQL em supabase/migrations via conexão Postgres directa.
 * Requer DATABASE_URL ou SUPABASE_DB_PASSWORD + VITE_SUPABASE_URL.
 */
import dns from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

dns.setDefaultResultOrder("ipv4first");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");

const POOLER_REGIONS = [
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-north-1",
  "us-east-1",
  "us-west-1",
  "ap-southeast-1",
];

const POOLER_PREFIXES = ["aws-1", "aws-0"];

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

async function ipv4DatabaseUrl(databaseUrl) {
  try {
    const config = parsePgConfig(databaseUrl);
    if (!config.host.endsWith(".supabase.co")) return null;
    const { address } = await dnsLookup(config.host, { family: 4 });
    return `postgresql://${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}@${address}:${config.port}/${config.database}`;
  } catch {
    return null;
  }
}

function buildPoolerUrls(databaseUrl, preferredRegion, overridePassword) {
  try {
    const config = parsePgConfig(databaseUrl);
    const directMatch = config.host.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (!directMatch) return [];

    const ref = directMatch[1];
    const rawPassword = overridePassword || config.password;
    const password = encodeURIComponent(rawPassword);
    const database = config.database;
    const regions = preferredRegion
      ? [preferredRegion, ...POOLER_REGIONS.filter((r) => r !== preferredRegion)]
      : POOLER_REGIONS;

    const urls = [];
    for (const prefix of POOLER_PREFIXES) {
      for (const region of regions) {
        for (const port of ["6543", "5432"]) {
          urls.push(
            `postgresql://postgres.${ref}:${password}@${prefix}-${region}.pooler.supabase.com:${port}/${database}`,
          );
        }
      }
    }
    urls.push(
      `postgresql://postgres.${ref}:${password}@db.${ref}.supabase.co:6543/${database}`,
    );
    return urls;
  } catch {
    return [];
  }
}

export async function connectionCandidates(env) {
  const primary = resolveDatabaseUrl(env);
  if (!primary) return [];

  const primaryConfig = parsePgConfig(primary);
  if (primaryConfig.host.includes("pooler.supabase.com")) {
    return [primary];
  }

  const overridePassword = env.SUPABASE_DB_PASSWORD?.trim() || "";
  const preferredRegion = env.SUPABASE_REGION?.trim() || "eu-central-1";
  const ipv4Direct = await ipv4DatabaseUrl(primary);
  const pooler = buildPoolerUrls(primary, preferredRegion, overridePassword || undefined);
  return [...new Set([ipv4Direct, ...pooler].filter(Boolean))];
}

export function parsePgConfig(connectionString) {
  const normalized = connectionString.trim().replace(/^postgres:\/\//, "postgresql://");
  if (!normalized.startsWith("postgresql://")) {
    throw new Error("URI Postgres inválida.");
  }

  const withoutProto = normalized.slice("postgresql://".length);
  const atIdx = withoutProto.lastIndexOf("@");
  if (atIdx === -1) {
    throw new Error("URI Postgres sem credenciais.");
  }

  const userPart = withoutProto.slice(0, atIdx);
  const hostPart = withoutProto.slice(atIdx + 1);
  const colonIdx = userPart.indexOf(":");
  const user = decodeURIComponent(colonIdx === -1 ? userPart : userPart.slice(0, colonIdx));
  const password = decodeURIComponent(colonIdx === -1 ? "" : userPart.slice(colonIdx + 1));

  const slashIdx = hostPart.indexOf("/");
  const hostPort = slashIdx === -1 ? hostPart : hostPart.slice(0, slashIdx);
  const database = (slashIdx === -1 ? "postgres" : hostPart.slice(slashIdx + 1)).split("?")[0] || "postgres";
  const [host, portStr] = hostPort.includes(":")
    ? [hostPort.slice(0, hostPort.lastIndexOf(":")), hostPort.slice(hostPort.lastIndexOf(":") + 1)]
    : [hostPort, "5432"];

  return {
    host,
    port: Number(portStr || 5432),
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
  };
}

async function connectPg(candidates) {
  let lastError;
  for (let i = 0; i < candidates.length; i += 1) {
    const connectionString = candidates[i];
    const label = i === 0 ? "primary" : `fallback-${i}`;
    const config = parsePgConfig(connectionString);
    const client = new pg.Client(config);
    try {
      console.log(`Tentativa de ligação (${label}) → ${config.user}@${config.host}:${config.port}`);
      await client.connect();
      console.log(`Ligação OK (${label}).`);
      return client;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Falha (${label}): ${message}`);
      await client.end().catch(() => undefined);
    }
  }
  throw lastError ?? new Error(
    "Não foi possível ligar ao Postgres. Use DATABASE_URL = URI Session pooler do Supabase Dashboard, " +
      "ou adicione SUPABASE_DB_PASSWORD (password raw) nos secrets GitHub.",
  );
}

const env = {
  ...loadEnvFile(path.join(root, ".env")),
  ...loadEnvFile(path.join(root, ".env.production")),
  ...process.env,
};

const candidates = await connectionCandidates(env);
if (candidates.length === 0) {
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

const client = await connectPg(candidates);

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
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO public._pimo_schema_migrations (filename) VALUES ($1)",
        [file],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  const tables = [
    "users",
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

  const views = [
    "industrial_operations",
    "industrial_quality",
    "industrial_time_tracking",
    "industrial_work_order_tasks_view",
    "industrial_tracking",
    "industrial_rework",
    "industrial_events",
    "industrial_settings",
  ];

  for (const view of views) {
    const check = await client.query(
      `SELECT to_regclass($1) AS reg`,
      [`public.${view}`],
    );
    if (!check.rows[0]?.reg) {
      throw new Error(`View em falta após migrations: ${view}`);
    }
    console.log(`OK view ${view}`);
  }

  const userColumns = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'users'
     ORDER BY ordinal_position`,
  );
  const expectedUserColumns = ["id", "email", "name", "role", "created_at"];
  const foundUserColumns = userColumns.rows.map((row) => row.column_name);
  for (const column of expectedUserColumns) {
    if (!foundUserColumns.includes(column)) {
      throw new Error(`Coluna em falta em public.users: ${column}`);
    }
  }
  console.log(`OK columns public.users (${foundUserColumns.join(", ")})`);

  const userRls = await client.query(
    `SELECT c.relrowsecurity AS enabled
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'users'`,
  );
  if (!userRls.rows[0]?.enabled) {
    throw new Error("RLS inactivo em public.users.");
  }
  console.log("OK RLS public.users");

  const userPolicies = await client.query(
    `SELECT policyname
     FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'users'
     ORDER BY policyname`,
  );
  const policyNames = userPolicies.rows.map((row) => row.policyname);
  for (const policy of ["users_select_all", "users_insert_all"]) {
    if (!policyNames.includes(policy)) {
      throw new Error(`Policy em falta em public.users: ${policy}`);
    }
  }
  console.log(`OK policies public.users (${policyNames.join(", ")})`);

  const industrialUser = await client.query(
    `SELECT id, email, name, role
     FROM public.users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    ["pimo-trak-industrial@pimo.pro"],
  );
  if (industrialUser.rows.length === 0) {
    throw new Error("Utilizador industrial padrão em falta em public.users.");
  }
  console.log("OK seed PIMO-TRAK industrial user", {
    id: industrialUser.rows[0].id,
    email: industrialUser.rows[0].email,
    role: industrialUser.rows[0].role,
  });

  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  if (supabaseUrl && anonKey) {
    const supabase = createClient(supabaseUrl, anonKey);
    const { data: byEmail, error: selectError } = await supabase
      .from("users")
      .select("id, email, name, role")
      .ilike("email", "pimo-trak-industrial@pimo.pro")
      .maybeSingle();
    if (selectError || !byEmail?.id) {
      throw new Error(`REST SELECT users falhou: ${selectError?.message ?? "sem dados"}`);
    }
    console.log("OK REST SELECT users", byEmail.id);

    const testEmail = `migration-test-${Date.now()}@pimo.pro.test`;
    const { data: inserted, error: insertError } = await supabase
      .from("users")
      .insert({
        email: testEmail,
        name: "Migration Test",
        role: "test",
      })
      .select("id")
      .single();
    if (insertError || !inserted?.id) {
      throw new Error(`REST INSERT users falhou: ${insertError?.message ?? "sem id"}`);
    }
    console.log("OK REST INSERT users", inserted.id);

    const { error: deleteError } = await supabase.from("users").delete().eq("id", inserted.id);
    if (deleteError) {
      throw new Error(`REST DELETE users falhou: ${deleteError.message}`);
    }
    console.log("OK REST DELETE users cleanup");
  } else {
    console.warn("AVISO: VITE_SUPABASE_URL/ANON_KEY ausentes — validação REST users ignorada.");
  }
} finally {
  await client.end();
}

console.log("Migrations concluídas.");
