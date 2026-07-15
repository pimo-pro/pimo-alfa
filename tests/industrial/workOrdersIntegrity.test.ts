import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSystemEventInsertPayload } from "../../src/industrial/persistence/events/buildSystemEventInsertPayload";

const rootDir = path.resolve(import.meta.dirname, "../..");
const persistWorkOrderPath = path.join(rootDir, "src/industrial/persistence/work-orders/persistWorkOrder.ts");
const logEventPath = path.join(rootDir, "src/industrial/persistence/events/logEvent.ts");
const generatePath = path.join(rootDir, "src/industrial/work-orders/generateWorkOrdersFromProjetosRecord.ts");
const handlerPath = path.join(rootDir, "src/industrial/api/iniciarProducaoHandler.ts");
const validatePath = path.join(rootDir, "src/industrial/persistence/work-orders/validateWorkOrderBeforeEvent.ts");
const workOrderActionsPath = path.join(rootDir, "src/industrial/api/workOrderActions.ts");

const SAMPLE_UUID = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("workOrdersIntegrity", () => {
  it("system_events evita FK legado e grava industrial_work_order_id em metadata", () => {
    const payload = buildSystemEventInsertPayload(
      "piece-abc",
      { type: "operation_started", workOrderId: SAMPLE_UUID },
      SAMPLE_UUID,
      SAMPLE_UUID,
    );
    expect(payload?.work_order_id).toBeNull();
    expect(payload?.user_id).toBeNull();
    expect(payload?.metadata.industrial_work_order_id).toBe(SAMPLE_UUID);
    expect(payload?.metadata.industrial_user_id).toBe(SAMPLE_UUID);
  });

  it("validateWorkOrderBeforeEvent expõe mensagem de bloqueio padrão", () => {
    const source = fs.readFileSync(validatePath, "utf8");
    expect(source).toContain("validateWorkOrderBeforeEvent");
    expect(source).toContain("Work Order inexistente ou não sincronizado. Produção não iniciada.");
    expect(source).toContain("notifyWorkOrderSyncError");
  });

  it("persistWorkOrder persiste ordem antes de tasks e eventos industriais", () => {
    const source = fs.readFileSync(persistWorkOrderPath, "utf8");
    const orderIdx = source.indexOf("WORK_ORDER_TABLES.orders");
    const tasksIdx = source.indexOf("WORK_ORDER_TABLES.tasks");
    const eventsIdx = source.indexOf("WORK_ORDER_TABLES.events");
    expect(orderIdx).toBeGreaterThan(-1);
    expect(tasksIdx).toBeGreaterThan(orderIdx);
    expect(eventsIdx).toBeGreaterThan(tasksIdx);
    expect(source).toContain("assertIndustrialWorkOrderId");
    expect(source).not.toContain("PIECE_PERSISTENCE_TABLES.systemEvents");
    expect(source).toContain("full_industrial_name");
  });

  it("logPieceEvent valida ordem antes de inserir system_events", () => {
    const source = fs.readFileSync(logEventPath, "utf8");
    expect(source).toContain("validateWorkOrderBeforeEvent");
    expect(source).toContain("buildSystemEventInsertPayload");
    expect(source).toContain("notifyWorkOrderSyncError");
  });

  it("generateWorkOrdersFromProjetosRecord valida ordens após persistência", () => {
    const source = fs.readFileSync(generatePath, "utf8");
    expect(source).toContain("validateWorkOrderBeforeEvent");
    expect(source).toContain("createWorkOrdersForProjetosRecord");
  });

  it("iniciar produção usa handler com fetch da BD e notificações", () => {
    const source = fs.readFileSync(handlerPath, "utf8");
    expect(source).toContain("fetchWorkOrders");
    expect(source).toContain("validateWorkOrderBeforeEvent");
    expect(source).toContain("notifyWorkOrderSyncError");
  });

  it("startTask bloqueia syncPiece quando work order inválido", () => {
    const source = fs.readFileSync(workOrderActionsPath, "utf8");
    expect(source).toContain("validateWorkOrderBeforeEvent");
    expect(source).toContain("notifyWorkOrderSyncError");
    expect(source).toContain("WORK_ORDER_SYNC_ERROR_MESSAGE");
  });

  it("UUID industrial válido para work_order_id", () => {
    expect(UUID_RE.test(SAMPLE_UUID)).toBe(true);
    expect(UUID_RE.test("invalid-id")).toBe(false);
  });
});
