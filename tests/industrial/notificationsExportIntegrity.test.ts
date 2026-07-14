import { beforeEach, describe, expect, it } from "vitest";
import { invariantNotificationStore } from "../../src/stores/invariantNotificationStore";
import { industrialExportPanelStore } from "../../src/stores/industrialExportPanelStore";
import {
  dispatchIndustrialNotification,
  notifyCncWarnings,
  notifyNestingWarnings,
  notifyUser,
  payloadFromIndustrialError,
  throwIndustrialError,
  validateCncExportCancelled,
  validateMaterialThicknessIssue,
} from "../../src/industrial/errors/industrialNotificationBridge";
import { IndustrialError } from "../../src/core/industrial/IndustrialError";
import type { IndustrialThicknessAdjustment } from "../../src/core/cnc/industrialThicknessResolution";

describe("notificationsExportIntegrity", () => {
  beforeEach(() => {
    invariantNotificationStore.getState().clearAll();
    industrialExportPanelStore.getState().clearAll();
  });

  it("regista erro de chapa ausente em Notificações e painel export", () => {
    const err = IndustrialError.noSheetAvailable({
      boxId: "C1",
      pieceId: "C1_COSTA",
      materialKey: "carvalho-20",
      thicknessMm: 19,
      suggestedLabel: "Carvalho 20mm",
      suggestedThicknessMm: 20,
    });

    dispatchIndustrialNotification(payloadFromIndustrialError(err));

    expect(invariantNotificationStore.getState().notifications.length).toBe(1);
    expect(invariantNotificationStore.getState().notifications[0]?.severity).toBe("error");
    expect(invariantNotificationStore.getState().notifications[0]?.message).toContain("carvalho-20");
    expect(invariantNotificationStore.getState().notifications[0]?.message).toContain("20 mm");

    expect(industrialExportPanelStore.getState().messages.length).toBe(1);
    expect(industrialExportPanelStore.getState().messages[0]?.hints[0]).toContain("Carvalho 20mm");
  });

  it("regista erro de espessura incorreta", () => {
    notifyUser({
      source: "espessura",
      severity: "error",
      step: "Espessura industrial",
      message: "Espessura inválida (19 mm) para carvalho-20.",
      hints: ["Alterar espessura para 20 mm"],
      phase: "export",
      kind: "invalid_thickness",
    });

    expect(invariantNotificationStore.getState().notifications.length).toBe(1);
    expect(industrialExportPanelStore.getState().messages.length).toBe(1);
  });

  it("regista aviso CNC cancelado com sugestão de chapa", () => {
    validateCncExportCancelled("carvalho-20: 19 mm em 3 peça(s). Sugestão: Carvalho 20mm (20 mm).");

    const notifications = invariantNotificationStore.getState().notifications;
    expect(notifications.length).toBe(1);
    expect(notifications[0]?.severity).toBe("warning");
    expect(notifications[0]?.message).toContain("Exportação CNC cancelada");
    expect(notifications[0]?.message).toContain("carvalho-20");

    const panel = industrialExportPanelStore.getState().messages;
    expect(panel.length).toBe(1);
    expect(panel[0]?.step).toBe("Exportação CNC cancelada");
  });

  it("regista erro de Nesting por espessura", () => {
    notifyNestingWarnings(["Exportação cancelada por matéria-prima sem chapa válida."]);

    expect(invariantNotificationStore.getState().notifications[0]?.ruleName).toBe("Nesting por espessura");
    expect(industrialExportPanelStore.getState().messages[0]?.message).toContain("matéria-prima");
  });

  it("regista erro de material inválido", () => {
    const err = IndustrialError.materialNotFound({
      boxId: "A1",
      pieceId: "A1_TOP",
      materialKey: "material-desconhecido",
    });
    expect(() => throwIndustrialError(err)).toThrow(IndustrialError);
    expect(invariantNotificationStore.getState().notifications.length).toBe(1);
    expect(industrialExportPanelStore.getState().messages.length).toBe(1);
  });

  it("notifyCncWarnings cobre ajustes de espessura", () => {
    const issue: IndustrialThicknessAdjustment = {
      materialKey: "carvalho-20",
      requestedThicknessMm: 19,
      suggestedThicknessMm: 20,
      suggestedMaterialId: "carvalho-20",
      suggestedMaterialLabel: "Carvalho 20mm",
      pieceNames: ["Lateral"],
      count: 1,
    };
    validateMaterialThicknessIssue(issue);

    expect(invariantNotificationStore.getState().notifications.length).toBe(1);
    expect(industrialExportPanelStore.getState().messages[0]?.message).toContain("19 mm");
    expect(industrialExportPanelStore.getState().messages[0]?.hints[0]).toContain("20 mm");
  });

  it("notifyCncWarnings envia múltiplas linhas para Notificações", () => {
    notifyCncWarnings(["carvalho-20: 19 mm", "mdf-branco: 18 mm"]);
    expect(invariantNotificationStore.getState().notifications.length).toBe(2);
    expect(industrialExportPanelStore.getState().messages.length).toBe(2);
  });
});
