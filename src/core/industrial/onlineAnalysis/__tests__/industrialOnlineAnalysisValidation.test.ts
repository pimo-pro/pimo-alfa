import { describe, expect, it } from "vitest";
import {
  formatIndustrialAnalysisValidationErrors,
  isBlockedIndustrialAnalysisField,
  isValidIndustrialAnalysisMaterial,
  parseIndustrialAnalysisQty,
  sanitizeIndustrialDocumentOverride,
  validateIndustrialOnlineAnalysisDraft,
} from "../industrialOnlineAnalysisValidation";
import type { IndustrialOnlineAnalysisTableSection } from "../industrialOnlineAnalysisViewTypes";

describe("industrialOnlineAnalysisValidation", () => {
  it("parseIndustrialAnalysisQty accepts integers >= 1", () => {
    expect(parseIndustrialAnalysisQty("1")).toBe(1);
    expect(parseIndustrialAnalysisQty("12")).toBe(12);
    expect(parseIndustrialAnalysisQty("0")).toBeNull();
    expect(parseIndustrialAnalysisQty("-1")).toBeNull();
    expect(parseIndustrialAnalysisQty("abc")).toBeNull();
    expect(parseIndustrialAnalysisQty("1.5")).toBeNull();
    expect(parseIndustrialAnalysisQty("")).toBeNull();
  });

  it("isValidIndustrialAnalysisMaterial rejects empty/placeholder", () => {
    expect(isValidIndustrialAnalysisMaterial("MDF")).toBe(true);
    expect(isValidIndustrialAnalysisMaterial("")).toBe(false);
    expect(isValidIndustrialAnalysisMaterial("-")).toBe(false);
    expect(isValidIndustrialAnalysisMaterial(String.fromCodePoint(0x2014))).toBe(false);
    expect(isValidIndustrialAnalysisMaterial("  ")).toBe(false);
  });

  it("blocks industrial geometry keys", () => {
    expect(isBlockedIndustrialAnalysisField("dimensoes")).toBe(true);
    expect(isBlockedIndustrialAnalysisField("boxId")).toBe(true);
    expect(isBlockedIndustrialAnalysisField("material")).toBe(false);
  });

  it("validateIndustrialOnlineAnalysisDraft blocks invalid qtd/material", () => {
    const draft: IndustrialOnlineAnalysisTableSection[] = [
      {
        id: "cutlist",
        title: "Lista",
        columns: [
          { key: "qtd", label: "Qtd", editable: true },
          { key: "material", label: "Material", editable: true },
        ],
        rows: [
          {
            rowId: "r1",
            cells: { qtd: "0", material: "" },
            origin: "canonical",
            modifiedFields: ["qtd", "material"],
            pendingDelete: false,
          },
        ],
      },
    ];
    const result = validateIndustrialOnlineAnalysisDraft("cutlist", draft);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.fieldKey === "qtd")).toBe(true);
    expect(result.errors.some((e) => e.fieldKey === "material")).toBe(true);
    expect(formatIndustrialAnalysisValidationErrors(result.errors)).toContain("Guardar bloqueado");
  });

  it("sanitizeIndustrialDocumentOverride strips blocked keys and deleted patches", () => {
    const sanitized = sanitizeIndustrialDocumentOverride({
      deletedRowIds: ["gone"],
      addedRows: [],
      rowPatches: {
        gone: {
          fields: { material: "X" },
          updatedAt: "t",
          updatedBy: { userId: "u", userName: "U" },
          source: "manual",
        },
        keep: {
          fields: { material: "MDF", dimensoes: "1x1x1", qtd: "0", boxId: "b1" },
          updatedAt: "t",
          updatedBy: { userId: "u", userName: "U" },
          source: "manual",
        },
      },
    });
    expect(sanitized.rowPatches.gone).toBeUndefined();
    expect(sanitized.rowPatches.keep?.fields.material).toBe("MDF");
    expect(sanitized.rowPatches.keep?.fields.dimensoes).toBeUndefined();
    expect(sanitized.rowPatches.keep?.fields.qtd).toBeUndefined();
    expect(sanitized.rowPatches.keep?.fields.boxId).toBeUndefined();
  });
});
