#!/usr/bin/env node
/* eslint-disable no-console */
import { randomBytes } from "node:crypto";

const TOKEN_MAX_LEN = 10;
const ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function normalizePieceDigits(raw) {
  const n = Number.parseInt(raw || "3", 10);
  if (n <= 2) return 2;
  if (n >= 4) return 4;
  return 3;
}

function pieceSuffix(pieceNumber, digits) {
  const max = 10 ** digits - 1;
  const safe = ((Math.max(1, Number(pieceNumber) || 1) - 1) % max) + 1;
  return String(safe).padStart(digits, "0");
}

function randomPrefix(length) {
  if (length <= 0) return "";
  const buf = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALNUM[buf[i] % ALNUM.length];
  }
  return out;
}

function buildToken(pieceNumber, pieceDigits) {
  const suffix = pieceSuffix(pieceNumber, pieceDigits);
  const prefixLen = Math.max(1, TOKEN_MAX_LEN - pieceDigits);
  const prefix = randomPrefix(prefixLen);
  return `${prefix}${suffix}`.slice(0, TOKEN_MAX_LEN);
}

/**
 * Exemplo de uso:
 * DATABASE_URL=postgres://... PIECE_DIGITS=3 node scripts/backfill_short_qr.js
 */
async function main() {
  const pieceDigits = normalizePieceDigits(process.env.PIECE_DIGITS);
  let Pool;
  try {
    const pg = await import("pg");
    Pool = pg.Pool;
  } catch (err) {
    console.error("Dependência pg não encontrada. Instale com: npm i pg");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não definido.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  let updated = 0;

  try {
    await client.query("BEGIN");
    const rows = await client.query(
      "SELECT id, piece_number FROM items WHERE short_qr IS NULL OR short_qr = ''"
    );
    for (const row of rows.rows) {
      let tries = 0;
      let token = "";
      while (tries < 20) {
        tries += 1;
        token = buildToken(row.piece_number, pieceDigits);
        const exists = await client.query(
          "SELECT 1 FROM items WHERE short_qr = $1 LIMIT 1",
          [token]
        );
        if (exists.rowCount === 0) break;
      }
      if (!token) continue;
      await client.query("UPDATE items SET short_qr = $1 WHERE id = $2", [
        token,
        row.id,
      ]);
      updated += 1;
    }
    await client.query(
      "UPDATE items SET short_qr = LEFT(short_qr, 10) WHERE short_qr IS NOT NULL AND length(short_qr) > 10"
    );
    await client.query("COMMIT");
    console.log(`Backfill concluído. Registos atualizados: ${updated}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Falha no backfill:", err?.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
