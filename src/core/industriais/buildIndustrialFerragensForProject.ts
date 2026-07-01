import { COMPONENT_TYPES_DEFAULT, type ComponentType } from "../components/componentTypes";
import { FERRAGENS_DEFAULT, type Ferragem } from "../ferragens/ferragens";
import { resolveIndustrialPieceRef } from "../cutlayout/cutLayoutProPieceNaming";
import { buildCutlistItemsForIndustrialExport } from "../fabrication/buildCutlistItemsForIndustrialExport";
import { gerarModeloIndustrial } from "../manufacturing/boxManufacturing";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import type { PieceObservacoesStore } from "../observacoes/observacoesTypes";
import {
  formatObservacoesForPdf,
  resolveObservacoesForCutListItem,
} from "../observacoes/ObservacoesService";
import { sanitizeIndustrialSegment } from "../etiquetas/industrialDisplayName";
import { safeGetItem } from "../../utils/storage";

const TIPO_TO_COMPONENT_ID: Record<string, string> = {
  cima: "cima",
  fundo: "fundo",
  lateral_esquerda: "lateral_esquerda",
  lateral_direita: "lateral_direita",
  COSTA: "costa",
  prateleira: "prateleira",
  porta_dupla: "porta",
  porta_simples: "porta",
  porta_correr: "porta",
  gaveta_frente: "gaveta_frente",
  gaveta_frente_ext: "gaveta_frente",
  gaveta_lat_esq: "gaveta_lat_esq",
  gaveta_lat_dir: "gaveta_lat_dir",
  gaveta_fundo: "gaveta_fundo",
  gaveta_traseira: "gaveta_traseira",
};

export type IndustrialFerragemPdfRow = {
  caixa: string;
  peca: string;
  ferragem: string;
  qtd: number;
  material: string;
  codigoIndustrial: string;
  shortCode: string;
  observacoes: string;
};

export type ProjectIndustrialFerragens = {
  projectName: string;
  projectCode: string;
  generatedAt: string;
  rows: IndustrialFerragemPdfRow[];
};

export type IndustrialFerragensProjectInput = {
  projectName?: string;
  boxes: BoxModule[];
  rules: RulesConfig;
  materialId?: string;
  extractedPartsByBoxId?: Record<string, Record<string, CutListItemComPreco[]>>;
  remates?: import("../remate/rematePieceTypes").RematePiece[];
  rodapes?: import("../rodape/rodapeTypes").ProjectRodape[];
  pieceObservacoes?: PieceObservacoesStore;
};

function loadComponentTypes(): ComponentType[] {
  const raw = safeGetItem("pimo_component_types");
  if (!raw) return COMPONENT_TYPES_DEFAULT;
  try {
    const parsed = JSON.parse(raw) as ComponentType[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : COMPONENT_TYPES_DEFAULT;
  } catch {
    return COMPONENT_TYPES_DEFAULT;
  }
}

function loadFerragens(): Ferragem[] {
  const raw = safeGetItem("pimo_ferragens");
  if (!raw) return FERRAGENS_DEFAULT;
  try {
    const parsed = JSON.parse(raw) as Ferragem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : FERRAGENS_DEFAULT;
  } catch {
    return FERRAGENS_DEFAULT;
  }
}

function ferragemLabel(ferragemId: string, catalog: Map<string, Ferragem>): string {
  return catalog.get(ferragemId)?.nome ?? ferragemId;
}

function pushPieceFerragens(
  rows: IndustrialFerragemPdfRow[],
  item: CutListItemComPreco,
  boxNome: string,
  projectName: string,
  ctById: Record<string, ComponentType>,
  ferragemById: Map<string, Ferragem>,
  pieceObservacoes?: PieceObservacoesStore
): void {
  const componentId = TIPO_TO_COMPONENT_ID[item.tipo] ?? item.tipo;
  const ct = ctById[componentId];
  const peca = resolveIndustrialPieceRef(item, boxNome, projectName);
  const codigoIndustrial = peca;
  const shortCode = String(item.shortCode ?? "").trim() || "—";
  const material = String(item.material ?? item.materialId ?? "—").trim() || "—";
  const observacoes = formatObservacoesForPdf(
    resolveObservacoesForCutListItem(item, { pieceObservacoes })
  );

  const defs = ct?.ferragens_default ?? [];
  if (defs.length === 0) return;

  for (const def of defs) {
    const qtd =
      def.quantidade_fixa ??
      (def.quantidade_por_lado != null
        ? def.quantidade_por_lado * Math.max(1, def.aplicar_em?.length ?? 1)
        : 1);
    rows.push({
      caixa: boxNome,
      peca,
      ferragem: ferragemLabel(def.ferragem_id, ferragemById),
      qtd,
      material,
      codigoIndustrial,
      shortCode,
      observacoes,
    });
  }
}

export function buildIndustrialFerragensForProject(
  project: IndustrialFerragensProjectInput
): ProjectIndustrialFerragens {
  const projectName = project.projectName?.trim() || "Projeto";
  const componentTypes = loadComponentTypes();
  const ferragens = loadFerragens();
  const ctById = Object.fromEntries(componentTypes.map((ct) => [ct.id, ct]));
  const ferragemById = new Map(ferragens.map((f) => [f.id, f]));
  const rows: IndustrialFerragemPdfRow[] = [];

  const items = buildCutlistItemsForIndustrialExport({
    boxes: project.boxes,
    rules: project.rules,
    materialId: project.materialId,
    projectName,
    remates: project.remates ?? [],
    rodapes: project.rodapes ?? [],
    extractedPartsByBoxId: project.extractedPartsByBoxId,
  });

  const boxNomeById = Object.fromEntries(
    (project.boxes ?? []).map((b) => [b.id, b.nome?.trim() || b.id])
  );

  for (const item of items) {
    const boxNome = boxNomeById[item.boxId ?? ""] ?? item.boxId ?? "—";
    pushPieceFerragens(
      rows,
      item,
      boxNome,
      projectName,
      ctById,
      ferragemById,
      project.pieceObservacoes
    );
  }

  for (const box of project.boxes ?? []) {
    const boxNome = box.nome?.trim() || box.id;
    const modelo = gerarModeloIndustrial(box, project.rules);
    for (const f of modelo.ferragens) {
      rows.push({
        caixa: boxNome,
        peca: "—",
        ferragem: f.tipo,
        qtd: f.quantidade,
        material: "—",
        codigoIndustrial: "—",
        shortCode: "—",
        observacoes: "",
      });
    }
  }

  return {
    projectName,
    projectCode: (sanitizeIndustrialSegment(projectName) || "PROJETO").toUpperCase(),
    generatedAt: new Date().toISOString(),
    rows,
  };
}
