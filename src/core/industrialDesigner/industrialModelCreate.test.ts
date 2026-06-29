import { describe, expect, it, beforeEach } from "vitest";
import { getBaseCabinetById } from "../baseCabinets";
import { cutlistComPrecoFromBox } from "../manufacturing/cutlistFromBoxes";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { BoxModule } from "../types";
import { getMergedBoxModelsRegistry } from "../../data/moveisUnificados/boxModelsRegistry";
import { buildViewerDrillMarkersByPanel } from "../../modules/drilling/drillingAdapter";
import {
  buildIndustrialBase600x720x500DesignBox,
  registerIndustrialBase600x720x500Module,
} from "./modules/industrialBase600x720x500v1";
import {
  buildIndustrialUpper600x350x300DesignBox,
  registerIndustrialUpper600x350x300Module,
} from "./modules/industrialUpper600x350x300v1";
import {
  INDUSTRIAL_BASE_600_MODULE_ID,
  INDUSTRIAL_BASE_600_MODULE_NOME,
} from "./modules/industrialBaseConstants";
import {
  INDUSTRIAL_UPPER_600_MODULE_ID,
  INDUSTRIAL_UPPER_600_MODULE_NOME,
} from "./modules/industrialUpperConstants";
import {
  addDesignPanel,
  buildCutListFromDesignBox,
  buildDrillFilesFromDesignBox,
  buildViewerDrillMarkersFromDesign,
  createCustomIndustrialModelFromDesignBox,
  createIndustrialDesignBox,
  designDrillHoleToTechnical,
  getCustomIndustrialModel,
  getIndustrialCatalogModel,
  getInnerDimensions,
  insertDesignHoleWithCavilhaPairing,
  instantiateCustomIndustrialModelForWorkspaceBox,
  isCustomIndustrialModelId,
  isIndustrialCatalogModelId,
  isLeftLateral,
  listIndustrialCatalogModelsAsBaseCabinet,
  resolveCustomIndustrialCutlistForBox,
} from "./index";
import { __resetBuiltinIndustrialBootstrapForTests } from "./builtinIndustrialBootstrap";
import { __resetBuiltinIndustrialModelsForTests } from "./staticIndustrialRegistry";
import {
  __resetCustomIndustrialModelsForTests,
  __setCustomIndustrialModelIdFactory,
} from "./customIndustrialModel";

const project = {
  projectName: "TESTE_MODELO_INDUSTRIAL",
  boxes: [],
  rules: defaultRulesConfig,
};

function countViewerHoles(markers: ReturnType<typeof buildViewerDrillMarkersFromDesign>): number {
  return (
    markers.cima.length +
    markers.fundo.length +
    markers.lateral_esquerda.length +
    markers.lateral_direita.length +
    (markers.porta?.length ?? 0)
  );
}

function countCutlistHoles(cutlist: ReturnType<typeof buildCutListFromDesignBox>): number {
  return cutlist.reduce((sum, item) => sum + (item.drillHoles?.length ?? 0), 0);
}

function buildDesignWithShelfAndCavilhas(): ReturnType<typeof createIndustrialDesignBox> {
  const inner = getInnerDimensions(
    createIndustrialDesignBox({ outerWidthMm: 600, outerHeightMm: 720, outerDepthMm: 500 })
  );
  let box = createIndustrialDesignBox({
    outerWidthMm: 600,
    outerHeightMm: 720,
    outerDepthMm: 500,
    espessuraMm: 19,
    materialId: "mdf_branco",
  });

  box = addDesignPanel(box, {
    tipo: "prateleira",
    widthMm: inner.larguraInterna,
    heightMm: inner.profundidadeInterna,
    thicknessMm: 19,
    materialId: "mdf_branco",
    positionMm: { x: 19, y: 300, z: 10 },
  });

  const lateralLe = box.panels.find((p) => isLeftLateral(p))!;
  box = insertDesignHoleWithCavilhaPairing(
    box,
    lateralLe.id,
    "cavilha_10x30",
    90,
    50,
    "espessura"
  ).box;

  return box;
}

describe("createCustomIndustrialModelFromDesignBox — E2E", () => {
  beforeEach(() => {
    __resetCustomIndustrialModelsForTests();
    __resetBuiltinIndustrialModelsForTests();
    __resetBuiltinIndustrialBootstrapForTests();
    __setCustomIndustrialModelIdFactory(() => "custom-model-test-001");
  });

  it("cria caixa → prateleira → cavilhas → cutlist → TXML com SSOT", () => {
    const designBox = buildDesignWithShelfAndCavilhas();
    const { record } = createCustomIndustrialModelFromDesignBox({
      designBox,
      nome: "Modelo Teste E2E",
      project,
      rules: defaultRulesConfig,
    });

    expect(record.id).toBe("custom-model-test-001");
    expect(isCustomIndustrialModelId(record.id)).toBe(true);
    expect(record.tipo).toBe("industrial-designer");
    expect(record.designWorkspace).toBe(true);
    expect(record.metadata.holeCount).toBeGreaterThanOrEqual(2);
    expect(record.cutlist.length).toBeGreaterThanOrEqual(6);
    expect(record.drillExportFiles.length).toBeGreaterThanOrEqual(2);

    const liveCutlist = buildCutListFromDesignBox(designBox);
    const liveMarkers = buildViewerDrillMarkersFromDesign(designBox);
    const liveTxml = buildDrillFilesFromDesignBox(designBox, project);

    expect(countCutlistHoles(record.cutlist)).toBe(countCutlistHoles(liveCutlist));
    expect(countViewerHoles(record.viewerMarkers)).toBe(countViewerHoles(liveMarkers));
    expect(record.drillExportFiles.length).toBe(liveTxml.length);

    for (const panel of designBox.panels) {
      if (!panel.drillHoles.length) continue;
      const cutItem = record.cutlist.find((i) => i.id === panel.id);
      expect(cutItem?.drillHoles?.length).toBe(panel.drillHoles.length);

      panel.drillHoles.forEach((hole, idx) => {
        const technical = designDrillHoleToTechnical(hole, panel.tipo);
        const stored = cutItem!.drillHoles![idx];
        expect(stored.x).toBe(technical.x);
        expect(stored.y).toBe(technical.y);
        expect(stored.diameter).toBe(technical.diametro);
        expect(stored.depth).toBe(technical.profundidade);
      });
    }

    for (const file of record.drillExportFiles) {
      expect(file.xml).toContain("KDTPanelFormat");
      expect(file.xml).toContain("Diameter>");
    }

    const pairedLateral = record.drillExportFiles.find((f) => f.partName === "Lateral esquerda");
    const pairedFundo = record.drillExportFiles.find((f) => f.partName === "Fundo");
    expect(pairedLateral?.xml).toContain("Depth>30.00");
    expect(pairedFundo?.xml).toContain("Depth>13.00");
  });

  it("modelo aparece no catálogo e pode ser instanciado no workspace", () => {
    const designBox = buildDesignWithShelfAndCavilhas();
    const { record } = createCustomIndustrialModelFromDesignBox({
      designBox,
      project,
      rules: defaultRulesConfig,
    });

    const inCatalog = getBaseCabinetById(record.id);
    expect(inCatalog).toBeDefined();
    expect(inCatalog?.tipo).toBe("industrial-designer");
    expect(inCatalog?.designWorkspace).toBe(true);

    const merged = getMergedBoxModelsRegistry();
    expect(merged.some((m) => m.id === record.id)).toBe(true);

    const workspaceBoxId = "ws-box-instance-1";
    const instance = instantiateCustomIndustrialModelForWorkspaceBox(
      record.id,
      workspaceBoxId,
      "Instância Teste"
    );
    expect(instance).not.toBeNull();
    expect(instance!.designBox.id).toBe(workspaceBoxId);
    expect(instance!.designBox.panels.length).toBe(record.designBox.panels.length);

    const boxModule: BoxModule = {
      id: workspaceBoxId,
      nome: "Instância Teste",
      dimensoes: {
        largura: record.widthMm,
        altura: record.heightMm,
        profundidade: record.depthMm,
      },
      espessura: record.metadata.espessuraMm,
      tipoBorda: "reta",
      tipoFundo: "recuado",
      models: [],
      prateleiras: 1,
      portaTipo: "sem_porta",
      gavetas: 0,
      alturaGaveta: 200,
      doorsLayer: [],
      drawersLayer: [],
      divisores: [],
      separadores: [],
      baseCabinetId: record.id,
      customIndustrialModelId: record.id,
      ferragens: [],
      cutList: [],
      cutListComPreco: [],
      estrutura3D: null,
      precoTotalPecas: 0,
    };

    const cutlist = resolveCustomIndustrialCutlistForBox(boxModule);
    expect(cutlist).not.toBeNull();
    expect(cutlist!.length).toBe(record.cutlistComPreco.length);
    expect(cutlist!.every((i) => i.boxId === workspaceBoxId)).toBe(true);
    expect(countCutlistHoles(cutlist!)).toBe(countCutlistHoles(record.cutlist));

    const pipelineCutlist = cutlistComPrecoFromBox(boxModule, defaultRulesConfig);
    expect(pipelineCutlist.length).toBe(record.cutlistComPreco.length);

    const viewerFromPipeline = buildViewerDrillMarkersByPanel(pipelineCutlist);
    const viewerFromRecord = buildViewerDrillMarkersByPanel(
      record.cutlistComPreco.map((item) => ({ ...item, boxId: workspaceBoxId }))
    );
    expect(countViewerHoles(viewerFromPipeline)).toBe(countViewerHoles(viewerFromRecord));

    const stored = getCustomIndustrialModel(record.id);
    expect(stored?.metadata.cutlistItemCount).toBe(record.cutlist.length);
    expect(stored?.metadata.txmlFileCount).toBe(record.drillExportFiles.length);
  });
});

describe("industrial-base-600x720x500-v1 — módulo built-in", () => {
  beforeEach(() => {
    __resetCustomIndustrialModelsForTests();
    __resetBuiltinIndustrialModelsForTests();
    __resetBuiltinIndustrialBootstrapForTests();
  });

  it("constrói designBox com estrutura, prateleira, porta e furos industriais", () => {
    const designBox = buildIndustrialBase600x720x500DesignBox();
    expect(designBox.designWorkspace).toBe(false);
    expect(designBox.panels.length).toBeGreaterThanOrEqual(7);

    const tipos = designBox.panels.map((p) => p.tipo);
    expect(tipos).toContain("prateleira");
    expect(tipos).toContain("frente");

    const holeCount = designBox.panels.reduce((s, p) => s + p.drillHoles.length, 0);
    expect(holeCount).toBeGreaterThan(20);

    const lateralLe = designBox.panels.find((p) => isLeftLateral(p))!;
    expect(lateralLe.drillHoles.some((h) => h.holeTypeId === "cavilha_10x30")).toBe(true);
    expect(lateralLe.drillHoles.some((h) => h.holeTypeId === "tecnico_prateleira")).toBe(true);

    const door = designBox.panels.find((p) => p.tipo === "frente")!;
    expect(door.drillHoles.some((h) => h.holeTypeId.startsWith("dobradica"))).toBe(true);

    const costa = designBox.panels.find((p) => p.tipo === "costa")!;
    expect(costa.drillHoles.some((h) => h.holeTypeId === "fixacao_estrutural")).toBe(true);
  });

  it("registo → cutlist → TXML → viewer → catálogo → instanciação", () => {
    const record = registerIndustrialBase600x720x500Module();

    expect(record.id).toBe(INDUSTRIAL_BASE_600_MODULE_ID);
    expect(record.nome).toBe(INDUSTRIAL_BASE_600_MODULE_NOME);
    expect(record.designWorkspace).toBe(false);
    expect(isIndustrialCatalogModelId(record.id)).toBe(true);

    const liveCutlist = buildCutListFromDesignBox(record.designBox);
    const liveMarkers = buildViewerDrillMarkersFromDesign(record.designBox);
    const liveTxml = buildDrillFilesFromDesignBox(record.designBox, project);

    expect(countCutlistHoles(record.cutlist)).toBe(countCutlistHoles(liveCutlist));
    expect(countViewerHoles(record.viewerMarkers)).toBe(countViewerHoles(liveMarkers));
    expect(record.drillExportFiles.length).toBe(liveTxml.length);

    const inCatalog = listIndustrialCatalogModelsAsBaseCabinet().find(
      (m) => m.id === INDUSTRIAL_BASE_600_MODULE_ID
    );
    expect(inCatalog?.tipo).toBe("industrial-designer");
    expect(inCatalog?.designWorkspace).toBe(false);

    const workspaceBoxId = "ws-base-industrial-1";
    const instance = instantiateCustomIndustrialModelForWorkspaceBox(
      record.id,
      workspaceBoxId,
      "Base Industrial"
    );
    expect(instance?.designBox.id).toBe(workspaceBoxId);

    const boxModule: BoxModule = {
      id: workspaceBoxId,
      nome: "Base Industrial",
      dimensoes: {
        largura: record.widthMm,
        altura: record.heightMm,
        profundidade: record.depthMm,
      },
      espessura: record.metadata.espessuraMm,
      tipoBorda: "reta",
      tipoFundo: "recuado",
      models: [],
      prateleiras: 1,
      portaTipo: "sem_porta",
      gavetas: 0,
      alturaGaveta: 200,
      doorsLayer: [],
      drawersLayer: [],
      divisores: [],
      separadores: [],
      baseCabinetId: record.id,
      customIndustrialModelId: record.id,
      ferragens: [],
      cutList: [],
      cutListComPreco: [],
      estrutura3D: null,
      precoTotalPecas: 0,
    };

    const cutlist = resolveCustomIndustrialCutlistForBox(boxModule);
    expect(cutlist?.length).toBe(record.cutlistComPreco.length);
    expect(cutlistComPrecoFromBox(boxModule, defaultRulesConfig).length).toBe(
      record.cutlistComPreco.length
    );
    expect(getIndustrialCatalogModel(record.id)?.metadata.moduleKind).toBe(
      "industrial-base-600x720x500"
    );
  });
});

describe("industrial-upper-600x350x300-v1 — módulo built-in", () => {
  beforeEach(() => {
    __resetCustomIndustrialModelsForTests();
    __resetBuiltinIndustrialModelsForTests();
    __resetBuiltinIndustrialBootstrapForTests();
  });

  it("constrói designBox superior com estrutura, prateleira, porta e furos industriais", () => {
    const designBox = buildIndustrialUpper600x350x300DesignBox();
    expect(designBox.designWorkspace).toBe(false);
    expect(designBox.outerWidthMm).toBe(600);
    expect(designBox.outerHeightMm).toBe(350);
    expect(designBox.outerDepthMm).toBe(300);
    expect(designBox.panels.length).toBeGreaterThanOrEqual(7);

    const tipos = designBox.panels.map((p) => p.tipo);
    expect(tipos).toContain("prateleira");
    expect(tipos).toContain("frente");

    const holeCount = designBox.panels.reduce((s, p) => s + p.drillHoles.length, 0);
    expect(holeCount).toBeGreaterThan(15);

    const lateralLe = designBox.panels.find((p) => isLeftLateral(p))!;
    expect(lateralLe.drillHoles.some((h) => h.holeTypeId === "cavilha_10x30")).toBe(true);
    expect(lateralLe.drillHoles.some((h) => h.holeTypeId === "tecnico_prateleira")).toBe(true);

    const door = designBox.panels.find((p) => p.tipo === "frente")!;
    expect(door.drillHoles.some((h) => h.holeTypeId.startsWith("dobradica"))).toBe(true);

    const costa = designBox.panels.find((p) => p.tipo === "costa")!;
    expect(costa.drillHoles.some((h) => h.holeTypeId === "fixacao_estrutural")).toBe(true);
  });

  it("registo → cutlist → TXML → viewer → catálogo (upper) → instanciação", () => {
    const record = registerIndustrialUpper600x350x300Module();

    expect(record.id).toBe(INDUSTRIAL_UPPER_600_MODULE_ID);
    expect(record.nome).toBe(INDUSTRIAL_UPPER_600_MODULE_NOME);
    expect(record.designWorkspace).toBe(false);
    expect(record.tipo).toBe("industrial-designer");
    expect(isIndustrialCatalogModelId(record.id)).toBe(true);

    const liveCutlist = buildCutListFromDesignBox(record.designBox);
    const liveMarkers = buildViewerDrillMarkersFromDesign(record.designBox);
    const liveTxml = buildDrillFilesFromDesignBox(record.designBox, project);

    expect(countCutlistHoles(record.cutlist)).toBe(countCutlistHoles(liveCutlist));
    expect(countViewerHoles(record.viewerMarkers)).toBe(countViewerHoles(liveMarkers));
    expect(record.drillExportFiles.length).toBe(liveTxml.length);
    expect(record.drillExportFiles.length).toBeGreaterThan(0);
    expect(record.drillExportFiles.some((f) => f.xml.includes("Diameter>"))).toBe(true);

    const inCatalog = listIndustrialCatalogModelsAsBaseCabinet().find(
      (m) => m.id === INDUSTRIAL_UPPER_600_MODULE_ID
    );
    expect(inCatalog?.tipo).toBe("industrial-designer");
    expect(inCatalog?.designWorkspace).toBe(false);
    expect(inCatalog?.categoria).toBe("upper");

    const workspaceBoxId = "ws-upper-industrial-1";
    const instance = instantiateCustomIndustrialModelForWorkspaceBox(
      record.id,
      workspaceBoxId,
      "Superior Industrial"
    );
    expect(instance?.designBox.id).toBe(workspaceBoxId);

    const boxModule: BoxModule = {
      id: workspaceBoxId,
      nome: "Superior Industrial",
      dimensoes: {
        largura: record.widthMm,
        altura: record.heightMm,
        profundidade: record.depthMm,
      },
      espessura: record.metadata.espessuraMm,
      tipoBorda: "reta",
      tipoFundo: "recuado",
      models: [],
      prateleiras: 1,
      portaTipo: "sem_porta",
      gavetas: 0,
      alturaGaveta: 200,
      doorsLayer: [],
      drawersLayer: [],
      divisores: [],
      separadores: [],
      baseCabinetId: record.id,
      customIndustrialModelId: record.id,
      ferragens: [],
      cutList: [],
      cutListComPreco: [],
      estrutura3D: null,
      precoTotalPecas: 0,
    };

    const cutlist = resolveCustomIndustrialCutlistForBox(boxModule);
    expect(cutlist?.length).toBe(record.cutlistComPreco.length);
    expect(cutlistComPrecoFromBox(boxModule, defaultRulesConfig).length).toBe(
      record.cutlistComPreco.length
    );
    expect(getIndustrialCatalogModel(record.id)?.metadata.moduleKind).toBe(
      "industrial-upper-600x350x300"
    );
    expect(getIndustrialCatalogModel(record.id)?.metadata.categoriaCatalogo).toBe("upper");
  });
});
