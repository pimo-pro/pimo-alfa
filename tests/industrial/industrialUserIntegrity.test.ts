import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSystemEventInsertPayload } from "../../src/industrial/persistence/events/buildSystemEventInsertPayload";
import {
  isValidIndustrialUserId,
} from "../../src/industrial/persistence/users/industrialUserIds";

const rootDir = path.resolve(import.meta.dirname, "../..");
const getUserPath = path.join(rootDir, "src/industrial/persistence/users/getOrCreateIndustrialUser.ts");
const buildPayloadPath = path.join(rootDir, "src/industrial/persistence/events/buildSystemEventInsertPayload.ts");
const logEventPath = path.join(rootDir, "src/industrial/persistence/events/logEvent.ts");
const coreLogEventPath = path.join(rootDir, "src/industrial/core/events/actions.ts");
const handlerPath = path.join(rootDir, "src/industrial/api/iniciarProducaoHandler.ts");
const logWoEventPath = path.join(rootDir, "src/industrial/persistence/work-orders/logWorkOrderEvent.ts");

const SAMPLE_UUID = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

const migrationPath = path.join(rootDir, "supabase/migrations/011_restore_public_users.sql");

describe("industrialUserIntegrity", () => {
  it("migration restaura tabela public.users com schema base", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.users");
    expect(sql).toContain("id UUID PRIMARY KEY");
    expect(sql).toContain("email TEXT");
    expect(sql).toContain("name TEXT");
    expect(sql).toContain("role TEXT");
    expect(sql).toContain("created_at TIMESTAMPTZ");
    expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
  });

  it("getOrCreateIndustrialUser define utilizador industrial padrão", () => {
    const source = fs.readFileSync(getUserPath, "utf8");
    expect(source).toContain("getOrCreateIndustrialUser");
    expect(source).toContain("USERS_TABLE = 'users'");
    expect(source).toContain("pimo-trak-industrial@pimo.pro");
    expect(source).toContain("PIMO-TRAK Industrial");
    expect(source).toContain("createDefaultIndustrialUser");
  });

  it("buildSystemEventInsertPayload evita FK user_id legado", () => {
    const payload = buildSystemEventInsertPayload(
      "piece-1",
      { type: "operation_started", userId: "operator" },
      SAMPLE_UUID,
      SAMPLE_UUID,
    );
    expect(payload?.user_id).toBeNull();
    expect(payload?.metadata.industrial_user_id).toBe(SAMPLE_UUID);
    expect(payload?.metadata.requested_user_id).toBe("operator");
  });

  it("buildSystemEventInsertPayload bloqueia evento sem industrial_user_id válido", () => {
    const payload = buildSystemEventInsertPayload(
      "piece-1",
      { type: "operation_started" },
      null,
      "not-a-uuid",
    );
    expect(payload).toBeNull();
  });

  it("logPieceEvent resolve utilizador antes de inserir system_events", () => {
    const source = fs.readFileSync(logEventPath, "utf8");
    expect(source).toContain("getOrCreateIndustrialUser");
    expect(source).toContain("buildSystemEventInsertPayload");
    expect(source).not.toContain("user_id: payload.userId");
  });

  it("logEvent core usa industrial_user_id em metadata", () => {
    const source = fs.readFileSync(coreLogEventPath, "utf8");
    expect(source).toContain("getOrCreateIndustrialUser");
    expect(source).toContain("industrial_user_id");
    expect(source).toContain("user_id: null");
  });

  it("iniciarProducaoHandler regista eventos WO com utilizador válido", () => {
    const source = fs.readFileSync(handlerPath, "utf8");
    expect(source).toContain("getOrCreateIndustrialUser");
    expect(source).toContain("logWorkOrderEvent");
    expect(source).toContain("production_started");
    expect(source).not.toContain("system_events");
  });

  it("logWorkOrderEvent resolve operator_id industrial", () => {
    const source = fs.readFileSync(logWoEventPath, "utf8");
    expect(source).toContain("getOrCreateIndustrialUser");
    expect(source).toContain("industrial_user_id");
  });

  it("valida formato UUID industrial", () => {
    expect(isValidIndustrialUserId(SAMPLE_UUID)).toBe(true);
    expect(isValidIndustrialUserId("operator")).toBe(false);
    expect(isValidIndustrialUserId(null)).toBe(false);
  });
});
