import { describe, expect, it } from "vitest";
import { applyIndustrialDocumentOverrides, buildOverrideFromDraft } from "../applyIndustrialDocumentOverrides";
import type { IndustrialOnlineAnalysisTableSection } from "../industrialOnlineAnalysisViewTypes";

const columns = [
  { key: "qtd", label: "Qtd", editable: true },
  { key: "material", label: "Material", editable: true },
  { key: "dimensoes", label: "Dims", editable: false },
];

function section(
  rows: IndustrialOnlineAnalysisTableSection["rows"]
): IndustrialOnlineAnalysisTableSection[] {
  return [{ id: "cutlist", title: "Lista", columns, rows, modified: false }];
}

describe("applyIndustrialDocumentOverrides / buildOverrideFromDraft", () => {
  it("applies patches and marks modifiedFields", () => {
    const canonical = section([
      {
        rowId: "r1",
        cells: { qtd: "1", material: "MDF", dimensoes: "10x10x19" },
        origin: "canonical",
        modifiedFields: [],
        pendingDelete: false,
      },
    ]);
    const applied = applyIndustrialDocumentOverrides("cutlist", canonical, {
      cutlist: {
        deletedRowIds: [],
        addedRows: [],
        rowPatches: {
          r1: {
            fields: { material: "HDF" },
            updatedAt: "t",
            updatedBy: { userId: "u", userName: "U" },
            source: "manual",
          },
        },
      },
    });
    expect(applied[0].rows[0].cells.material).toBe("HDF");
    expect(applied[0].rows[0].modifiedFields).toContain("material");
    expect(applied[0].modified).toBe(true);
  });

  it("buildOverrideFromDraft sanitizes blocked keys from patches", () => {
    const canonical = section([
      {
        rowId: "r1",
        cells: { qtd: "1", material: "MDF", dimensoes: "10x10x19" },
        origin: "canonical",
        modifiedFields: [],
        pendingDelete: false,
      },
    ]);
    const draft = section([
      {
        rowId: "r1",
        cells: { qtd: "2", material: "HDF", dimensoes: "99x99x99" },
        origin: "canonical",
        modifiedFields: ["qtd", "material", "dimensoes"],
        pendingDelete: false,
      },
    ]);
    const override = buildOverrideFromDraft({
      docId: "cutlist",
      canonicalSections: canonical,
      draftSections: draft,
      actor: { userId: "u", userName: "U" },
    });
    expect(override.rowPatches.r1?.fields.qtd).toBe("2");
    expect(override.rowPatches.r1?.fields.material).toBe("HDF");
    expect(override.rowPatches.r1?.fields.dimensoes).toBeUndefined();
  });
});
