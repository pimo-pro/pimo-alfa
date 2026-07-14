import { beforeEach, describe, expect, it } from "vitest";
import type { MaterialRecord } from "../../src/core/materials/types";
import type { CutlistItemForPieces } from "../../src/core/cutlayout/cutLayoutEngine";
import { invariantNotificationStore } from "../../src/stores/invariantNotificationStore";
import { industrialExportPanelStore } from "../../src/stores/industrialExportPanelStore";
import {
  autoFixCncThicknessMismatch,
  autoFixMaterialThickness,
  autoFixNestingThickness,
  autoFixSheetThickness,
  buildCompleteExport,
  generateFullIndustrialFile,
  validateCncExport,
  validateMaterialThickness,
  validateNestingThickness,
} from "../../src/industrial/autoCorrection/industrialThicknessAutoCorrection";
import { IndustrialError } from "../../src/core/industrial/IndustrialError";

function carvalho20Material(): MaterialRecord {
  return {
    id: "carvalho-20",
    label: "Carvalho 20",
    sheetWidthMm: 2800,
    sheetHeightMm: 2070,
    sheetThicknessMm: 20,
    industrialMaterialId: "carvalho-20",
  };
}

function lateralItem(espessura: number, materialId = "carvalho-20"): CutlistItemForPieces {
  return {
    id: "c1-lateral",
    nome: "Lateral",
    quantidade: 1,
    espessura,
    materialId,
    material: "Carvalho 20",
    dimensoes: { largura: 600, altura: 720, profundidade: espessura },
    tipo: "lateral",
  };
}

describe("autoCorrectionIntegrity", () => {
  beforeEach(() => {
    invariantNotificationStore.getState().clearAll();
    industrialExportPanelStore.getState().clearAll();
  });

  it("corrige mismatch 19mm → 20mm automaticamente", () => {
    const materials = [carvalho20Material()];
    const items = [lateralItem(19)];

    const result = autoFixSheetThickness(items, materials);
    expect(result.applied.length).toBe(1);
    expect(result.applied[0]?.requestedThicknessMm).toBe(19);
    expect(result.applied[0]?.suggestedThicknessMm).toBe(20);
    expect(result.items[0]?.espessura).toBe(20);
  });

  it("corrige chapa ausente para chapa válida mais próxima", () => {
    const corrected = autoFixCncThicknessMismatch([lateralItem(19)], [carvalho20Material()]);
    expect(corrected[0]?.espessura).toBe(20);
    expect(corrected[0]?.sheetThicknessMm).toBe(20);
  });

  it("autoFixMaterialThickness aplica materialId sugerido", () => {
    const resolution = autoFixSheetThickness([lateralItem(19)], [carvalho20Material()]);
    const withMaterial = autoFixMaterialThickness(resolution.items, resolution.applied);
    expect(withMaterial[0]?.materialId).toBe("carvalho-20");
  });

  it("CNC mismatch corrigido com aviso em Notificações", () => {
    validateCncExport([lateralItem(19)], [carvalho20Material()]);

    const notifications = invariantNotificationStore.getState().notifications;
    expect(notifications.length).toBe(1);
    expect(notifications[0]?.message).toContain("Espessura corrigida automaticamente");
    expect(notifications[0]?.message).toContain("19 mm → 20 mm");
    expect(notifications[0]?.message).toContain("Carvalho 20");

    expect(industrialExportPanelStore.getState().messages.length).toBe(1);
  });

  it("nesting mismatch corrigido automaticamente", () => {
    const corrected = validateNestingThickness([lateralItem(19)], [carvalho20Material()]);
    expect(corrected[0]?.espessura).toBe(20);
    expect(invariantNotificationStore.getState().notifications.length).toBe(1);
  });

  it("validateMaterialThickness e generateFullIndustrialFile produzem itens corrigidos", () => {
    const viaValidate = validateMaterialThickness([lateralItem(19)], [carvalho20Material()]);
    const viaGenerate = generateFullIndustrialFile([lateralItem(19)], [carvalho20Material()]);
    const viaBuild = buildCompleteExport([lateralItem(19)], [carvalho20Material()]);

    expect(viaValidate[0]?.espessura).toBe(20);
    expect(viaGenerate[0]?.espessura).toBe(20);
    expect(viaBuild[0]?.espessura).toBe(20);
  });

  it("autoFixNestingThickness lança erro quando não há correção possível", () => {
    const noSheetMaterial: MaterialRecord = {
      id: "carvalho-20",
      label: "Carvalho 20",
      sheetWidthMm: 0,
      sheetHeightMm: 0,
      sheetThicknessMm: 0,
    };
    expect(() =>
      autoFixNestingThickness([lateralItem(19)], [noSheetMaterial])
    ).toThrow(IndustrialError);
    expect(invariantNotificationStore.getState().notifications.length).toBe(0);
  });

  it("exportação completa: itens corrigidos permitem continuar pipeline", () => {
    const corrected = buildCompleteExport(
      [lateralItem(19), lateralItem(19, "carvalho-20")],
      [carvalho20Material()]
    );
    expect(corrected.every((item) => item.espessura === 20)).toBe(true);
    expect(invariantNotificationStore.getState().notifications.length).toBeGreaterThan(0);
  });
});
