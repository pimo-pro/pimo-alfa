import { describe, expect, it, beforeEach } from "vitest";
import { buildCutListFromDesignBox, buildDrillFilesFromDesignBox } from "./designToCutlist";
import { buildViewerDrillMarkersFromDesign } from "./designToViewer";
import { defaultRulesConfig } from "../rules/rulesConfig";
import { countCornerFixedFrontFaceDowelConnections } from "../cornerCabinet/cornerFixedFrontDowels";
import {
  __resetBuiltinIndustrialModelsForTests,
  isIndustrialCatalogModelId,
  listBuiltinIndustrialModelsAsBaseCabinet,
  registerBuiltinIndustrialModel,
} from "./staticIndustrialRegistry";
import {
  buildIndustrialCornerRight900x720x600DesignBox,
  buildIndustrialCornerRight900ModelRecord,
} from "./modules/industrialCornerRight900x720x600v1";
import {
  INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID,
  INDUSTRIAL_CORNER_RIGHT_900_MODULE_NOME,
} from "./modules/industrialCornerRightConstants";

const project = { projectName: "TEST_CORNER", boxes: [], rules: defaultRulesConfig };

describe("industrial-corner-right-900x720x600-v1", () => {
  beforeEach(() => {
    __resetBuiltinIndustrialModelsForTests();
  });

  it("constrói designBox L com frente fixa, porta, costa L e prateleira recortada", () => {
    const designBox = buildIndustrialCornerRight900x720x600DesignBox();
    expect(designBox.panels.find((p) => p.tipo === "frente_fixa")?.widthMm).toBe(447);
    expect(designBox.panels.find((p) => p.tipo === "frente")?.widthMm).toBe(447);
    expect(designBox.panels.find((p) => p.id.endsWith(":lateral-interna"))?.thicknessMm).toBe(15);
    expect(designBox.panels.filter((p) => p.tipo === "costa")).toHaveLength(2);
    const shelf = designBox.panels.find((p) => p.tipo === "prateleira");
    expect(shelf?.cutouts?.some((c) => c.kind === "recorte_prateleira_canto")).toBe(true);
    expect(designBox.panels.reduce((s, p) => s + p.drillHoles.length, 0)).toBeGreaterThan(25);
    expect(countCornerFixedFrontFaceDowelConnections()).toBe(6);
  });

  it("model record → cutlist → TXML → viewer → catálogo corner (SSOT)", () => {
    const record = buildIndustrialCornerRight900ModelRecord(project);
    registerBuiltinIndustrialModel(record);

    expect(record.id).toBe(INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID);
    expect(record.nome).toBe(INDUSTRIAL_CORNER_RIGHT_900_MODULE_NOME);
    expect(isIndustrialCatalogModelId(record.id)).toBe(true);

    const liveCutlist = buildCutListFromDesignBox(record.designBox);
    const liveTxml = buildDrillFilesFromDesignBox(record.designBox, project);
    const liveMarkers = buildViewerDrillMarkersFromDesign(record.designBox);

    expect(record.cutlist.length).toBe(liveCutlist.length);
    expect(record.drillExportFiles.length).toBe(liveTxml.length);
    expect(record.drillExportFiles.some((f) => f.xml.includes("Diameter>"))).toBe(true);

    const holeCount = (items: typeof record.cutlist) =>
      items.reduce((s, i) => s + (i.drillHoles?.length ?? 0), 0);
    expect(holeCount(record.cutlist)).toBe(holeCount(liveCutlist));

    const markerCount = (m: typeof record.viewerMarkers) =>
      Object.values(m).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);
    expect(markerCount(record.viewerMarkers)).toBe(markerCount(liveMarkers));

    const catalog = listBuiltinIndustrialModelsAsBaseCabinet().find(
      (m) => m.id === INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID
    );
    expect(catalog?.categoria).toBe("corner");
    expect(catalog?.cornerFixedFront).toBe(true);
    expect(catalog?.subcategoriaCatalogo).toBe("caixas-de-canto");
  });

  it("validação geométrica da prateleira com recorte interno", () => {
    const shelf = buildIndustrialCornerRight900x720x600DesignBox().panels.find(
      (p) => p.tipo === "prateleira"
    )!;
    const cutout = shelf.cutouts?.find((c) => c.kind === "recorte_prateleira_canto");
    expect(cutout).toBeDefined();
    expect(cutout!.widthMm).toBeGreaterThan(180);
    expect(cutout!.heightMm).toBeGreaterThan(300);
    expect(cutout!.widthMm + cutout!.xMm).toBeLessThanOrEqual(shelf.widthMm + 1);
  });
});
