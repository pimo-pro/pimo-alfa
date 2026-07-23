import { describe, expect, it } from "vitest";
import {
  getDocumentaryOverrideDocId,
  isCutlistSsotDocId,
  legacyTecnicoRowIdAlias,
  resolveDocumentaryOverride,
} from "../industrialDocumentarySsot";
import { makeSsotCutlistRowId, makeCanonicalRowId } from "../industrialOnlineAnalysisRowIds";
import { applyIndustrialDocumentOverrides, documentHasOverrides } from "../applyIndustrialDocumentOverrides";
import type { IndustrialOnlineAnalysisTableSection } from "../industrialOnlineAnalysisViewTypes";

describe("industrialDocumentarySsot / cutlist?tecnico", () => {
  it("mapeia tecnico ? cutlist para overrides", () => {
    expect(getDocumentaryOverrideDocId("tecnico")).toBe("cutlist");
    expect(getDocumentaryOverrideDocId("cutlist")).toBe("cutlist");
    expect(getDocumentaryOverrideDocId("pecas_totais")).toBe("pecas_totais");
    expect(isCutlistSsotDocId("tecnico")).toBe(true);
    expect(isCutlistSsotDocId("cutlist")).toBe(true);
  });

  it("gera o mesmo rowId SSOT para cutlist e técnico", () => {
    const parts = ["box-1", "LAT_ESQ", 600, 720, 19, 0];
    const a = makeSsotCutlistRowId(parts);
    const b = makeCanonicalRowId("cutlist", "cutlist", parts);
    const legacy = makeCanonicalRowId("tecnico", "cutlist", parts);
    expect(a).toBe(b);
    expect(a).not.toBe(legacy);
    expect(legacyTecnicoRowIdAlias(a)).toBe(legacy);
  });

  it("resolve override legado sob tecnico e aplica a ambas as vistas", () => {
    const rowId = makeSsotCutlistRowId(["b1", "TOP", 100, 200, 19, 0]);
    const legacyId = legacyTecnicoRowIdAlias(rowId)!;
    const sections: IndustrialOnlineAnalysisTableSection[] = [
      {
        id: "cutlist",
        title: "Lista",
        columns: [{ key: "material", label: "Material", editable: true }],
        rows: [
          {
            rowId,
            cells: { material: "MDF" },
            origin: "canonical",
            modifiedFields: [],
            pendingDelete: false,
          },
        ],
        modified: false,
      },
    ];
    const store = {
      tecnico: {
        rowPatches: {
          [legacyId]: {
            fields: { material: "HDF" },
            updatedAt: new Date().toISOString(),
            updatedBy: { userId: "u", userName: "t" },
            source: "manual" as const,
          },
        },
        addedRows: [],
        deletedRowIds: [],
      },
    };
    expect(resolveDocumentaryOverride(store, "cutlist")).toBe(store.tecnico);
    expect(documentHasOverrides(store, "tecnico")).toBe(true);
    expect(documentHasOverrides(store, "cutlist")).toBe(true);

    const appliedCutlist = applyIndustrialDocumentOverrides("cutlist", sections, store);
    const appliedTecnico = applyIndustrialDocumentOverrides("tecnico", sections, store);
    expect(appliedCutlist[0].rows[0].cells.material).toBe("HDF");
    expect(appliedTecnico[0].rows[0].cells.material).toBe("HDF");
    expect(appliedCutlist[0].rows[0].rowId).toBe(appliedTecnico[0].rows[0].rowId);
  });
});
