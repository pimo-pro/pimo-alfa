import type { BoxModule, CutListItem } from "../types";
import type {
  OrlaFerragemLine,
  OrlaJuntoPair,
  OrlaPreset,
  OrlaSideId,
  PieceOrlaConfig,
  ProjectFerragemOrla,
} from "./orlaTypes";
import { EMPTY_ORLA_SIDES, ORLA_SIDES } from "./orlaTypes";
import { findOrlaPreset } from "./orlaPresets";
import { getOrlaEdgeLengthsMm } from "./orlaEdgeLengths";
import {
  buildPieceOrlaConfigForTipo,
  formatOrlaRefForPdf,
  isCostaPieceTipo,
  pieceAllowsOrlaByThickness,
  stripMaterialThicknessLabel,
} from "./orlaIndustrialRules";
import type { FerragensTotaisArmazemRow } from "../industrial/industrialBottomSectionData";
import { getMaterialDisplayInfo, getMaterialForBox } from "../materials/service";

type CalcInput = {
  boxes: BoxModule[];
  orlaPresets: OrlaPreset[];
  orlaPieces: Record<string, PieceOrlaConfig>;
  orlaJuntoPairs: OrlaJuntoPair[];
  /** Remates / rodapes e outras pecas fora de box.cutList */
  extraCutListItems?: Array<CutListItem & { boxId?: string; boxNome?: string }>;
};

function edgeKey(pieceId: string, side: OrlaSideId): string {
  return `${pieceId}:${side}`;
}

function panelIdFromCutListItem(item: CutListItem): string {
  const meta = item.metadata?.panelId;
  if (typeof meta === "string" && meta.trim().length > 0) return meta;
  return item.id;
}

export function lookupPieceOrlaConfig(
  pieceKey: string,
  orlaPieces: Record<string, PieceOrlaConfig>
): PieceOrlaConfig | undefined {
  if (orlaPieces[pieceKey]) return orlaPieces[pieceKey];
  return undefined;
}

function isOrlaJuntoPrimaryEdge(
  pair: OrlaJuntoPair,
  pieceId: string,
  side: OrlaSideId
): boolean {
  const ekA = edgeKey(pair.pieceAId, pair.sideA);
  const ekB = edgeKey(pair.pieceBId, pair.sideB);
  const ek = edgeKey(pieceId, side);
  if (ek !== ekA && ek !== ekB) return false;
  return ek === (ekA <= ekB ? ekA : ekB);
}

function collectPiecesForBox(
  box: BoxModule,
  extras: Array<CutListItem & { boxId?: string; boxNome?: string }>
): CutListItem[] {
  const fromBox = box.cutList ?? [];
  const fromExtra = extras.filter((e) => e.boxId === box.id);
  return [...fromBox, ...fromExtra];
}

export function computeOrlaFerragem(input: CalcInput): ProjectFerragemOrla {
  const { boxes, orlaPresets, orlaPieces, orlaJuntoPairs } = input;
  const extras = input.extraCutListItems ?? [];
  const counted = new Set<string>();
  const linhasMap = new Map<string, OrlaFerragemLine>();
  const porBox: Record<string, { metros: number; custo: number }> = {};

  const addMeters = (
    presetId: string,
    preset: OrlaPreset,
    metros: number,
    ctx: { boxId: string; boxNome: string; pieceId: string; pieceNome: string; tipo: "normal" | "orla_junto" }
  ) => {
    if (metros <= 0) return;
    const key = `${ctx.tipo}:${presetId}:${ctx.boxId}:${ctx.pieceId}:${ctx.tipo}`;
    const existing = linhasMap.get(key);
    const custo = metros * preset.precoPorMetro;
    if (existing) {
      existing.metros += metros;
      existing.custo += custo;
    } else {
      linhasMap.set(key, {
        id: key,
        presetId,
        presetNome: preset.nome,
        metros,
        custo,
        boxId: ctx.boxId,
        boxNome: ctx.boxNome,
        pieceId: ctx.pieceId,
        pieceNome: ctx.pieceNome,
        tipo: ctx.tipo,
      });
    }
    porBox[ctx.boxId] = porBox[ctx.boxId] ?? { metros: 0, custo: 0 };
    porBox[ctx.boxId].metros += metros;
    porBox[ctx.boxId].custo += custo;
  };

  const processItem = (
    item: CutListItem,
    ctx: { boxId: string; boxNome: string }
  ) => {
    const tipo = item.tipo ?? item.nome ?? "";
    if (isCostaPieceTipo(tipo)) return;
    const esp =
      Number(item.espessura) ||
      Number((item as { espessura_mm?: number }).espessura_mm) ||
      Number(item.dimensoes?.profundidade) ||
      0;
    if (!pieceAllowsOrlaByThickness(esp)) return;
    const pieceId = panelIdFromCutListItem(item);
    const cfg = lookupPieceOrlaConfig(pieceId, orlaPieces);
    if (!cfg) return;
    const edges = getOrlaEdgeLengthsMm(item);
    for (const side of ORLA_SIDES) {
      const sc = cfg.sides[side];
      if (!sc?.enabled || !sc.presetId) continue;
      const ek = edgeKey(pieceId, side);
      if (counted.has(ek)) continue;
      const juntoPair = orlaJuntoPairs.find(
        (p) =>
          (p.pieceAId === pieceId && p.sideA === side) ||
          (p.pieceBId === pieceId && p.sideB === side)
      );
      if (juntoPair && !isOrlaJuntoPrimaryEdge(juntoPair, pieceId, side)) {
        counted.add(ek);
        continue;
      }
      const preset = findOrlaPreset(orlaPresets, sc.presetId);
      if (!preset) continue;
      const metros = (edges[side] / 1000) * Math.max(1, item.quantidade ?? 1);
      addMeters(sc.presetId, preset, metros, {
        boxId: ctx.boxId,
        boxNome: ctx.boxNome,
        pieceId,
        pieceNome: item.nome,
        tipo: juntoPair ? "orla_junto" : "normal",
      });
      counted.add(ek);
    }
  };

  const boxIds = new Set(boxes.map((b) => b.id));
  for (const box of boxes) {
    const boxNome = box.nome || box.id;
    for (const item of collectPiecesForBox(box, extras)) {
      processItem(item, { boxId: box.id, boxNome });
    }
  }
  // Remates / rodapes sem parentBoxId (ou box inexistente)
  for (const item of extras) {
    if (item.boxId && boxIds.has(item.boxId)) continue;
    processItem(item, {
      boxId: item.boxId || "_orphan",
      boxNome: item.boxNome || "Remate/Rodape",
    });
  }

  const linhas = Array.from(linhasMap.values());
  const metrosTotal = linhas.reduce((s, l) => s + l.metros, 0);
  const custoTotal = linhas.reduce((s, l) => s + l.custo, 0);
  return { linhas, metrosTotal, custoTotal, porBox };
}

export function resolvePieceOrlaConfig(
  pieceId: string,
  orlaPieces: Record<string, PieceOrlaConfig>,
  boxPresetId: string | null | undefined,
  _presets: OrlaPreset[],
  pieceTipo?: string
): PieceOrlaConfig {
  const existing = lookupPieceOrlaConfig(pieceId, orlaPieces);
  if (existing) return existing;
  if (boxPresetId && pieceTipo) {
    return (
      buildPieceOrlaConfigForTipo(pieceTipo, boxPresetId) ?? { sides: EMPTY_ORLA_SIDES() }
    );
  }
  if (boxPresetId) {
    // Legacy fallback — preferir regras industriais quando tipo conhecido
    return {
      sides: {
        front: { presetId: boxPresetId, enabled: true },
        back: { presetId: boxPresetId, enabled: true },
        left: { presetId: boxPresetId, enabled: true },
        right: { presetId: boxPresetId, enabled: true },
      },
    };
  }
  return { sides: EMPTY_ORLA_SIDES() };
}

/**
 * Aplica orla automatica industrial por tipo de peca.
 * Costa nunca e incluida. Limpa entradas antigas da caixa quando preset e null.
 */
export function buildOrlaPiecesForBox(
  box: BoxModule,
  presetId: string | null,
  current: Record<string, PieceOrlaConfig>,
  extraItems: CutListItem[] = []
): Record<string, PieceOrlaConfig> {
  const next = { ...current };
  const items = [...(box.cutList ?? []), ...extraItems];
  const panelIds = new Set(items.map((i) => panelIdFromCutListItem(i)));

  if (!presetId) {
    for (const id of panelIds) {
      delete next[id];
    }
    return next;
  }

  for (const item of items) {
    const panelId = panelIdFromCutListItem(item);
    const tipo = item.tipo ?? item.nome ?? "";
    if (isCostaPieceTipo(tipo)) {
      delete next[panelId];
      continue;
    }
    const esp =
      Number(item.espessura) ||
      Number((item as { espessura_mm?: number }).espessura_mm) ||
      Number(item.dimensoes?.profundidade) ||
      0;
    const cfg = buildPieceOrlaConfigForTipo(tipo, presetId, current[panelId], esp);
    if (!cfg) {
      delete next[panelId];
      continue;
    }
    next[panelId] = cfg;
  }
  return next;
}

/** Reconstroi orlaPieces para todas as caixas com preset (sync apos cutlist). */
export function syncOrlaPiecesForProject(
  boxes: BoxModule[],
  current: Record<string, PieceOrlaConfig>,
  defaultPresetId: string | null,
  extrasByBoxId: Record<string, CutListItem[]> = {}
): Record<string, PieceOrlaConfig> {
  let next = { ...current };
  for (const box of boxes) {
    const presetId = box.orlaPresetId ?? defaultPresetId;
    if (!presetId) continue;
    next = buildOrlaPiecesForBox(box, presetId, next, extrasByBoxId[box.id] ?? []);
  }
  return next;
}

export function mergeOrlaIntoCutListItem(
  item: CutListItem,
  cfg: PieceOrlaConfig | undefined
): CutListItem {
  if (!cfg) return item;
  return {
    ...item,
    metadata: {
      ...(item.metadata ?? {}),
      orla: cfg.sides,
      orlaJunto: cfg.orlaJunto,
    },
  };
}

/** Resolve label de material da caixa sem espessura (PDF Orla). */
export function resolveOrlaMaterialLabelForBox(
  box: BoxModule | undefined,
  projectMaterialId?: string,
  fallbackLabel?: string
): string {
  let label = fallbackLabel ?? "";
  if (box) {
    const resolved = getMaterialForBox(box, projectMaterialId);
    if (resolved) label = getMaterialDisplayInfo(resolved).label || label;
  } else if (projectMaterialId) {
    label = getMaterialDisplayInfo(projectMaterialId).label || label;
  }
  return stripMaterialThicknessLabel(label) || "Orla";
}

/**
 * Agrega orla por (material da caixa, preset) para o PDF ferragens_totais.
 * Quantidade = metros; Ref = nome + espessura; material = chapa da caixa sem espessura.
 */
export function aggregateOrlaRowsForFerragensTotaisPdf(
  ferragemOrla: ProjectFerragemOrla | undefined | null,
  orlaPresets: OrlaPreset[],
  boxes: BoxModule[] = [],
  projectMaterialId?: string,
  fallbackMaterialLabel?: string
): FerragensTotaisArmazemRow[] {
  if (!ferragemOrla?.linhas?.length) return [];
  const boxById = new Map(boxes.map((b) => [b.id, b]));
  const byKey = new Map<
    string,
    { metros: number; preset: OrlaPreset; material: string }
  >();

  for (const linha of ferragemOrla.linhas) {
    const preset = findOrlaPreset(orlaPresets, linha.presetId);
    if (!preset) continue;
    const box = linha.boxId ? boxById.get(linha.boxId) : undefined;
    const material = resolveOrlaMaterialLabelForBox(
      box,
      projectMaterialId,
      fallbackMaterialLabel
    );
    const key = `${material}||${linha.presetId}`;
    const prev = byKey.get(key);
    if (prev) prev.metros += linha.metros;
    else byKey.set(key, { metros: linha.metros, preset, material });
  }

  const rows: FerragensTotaisArmazemRow[] = [];
  for (const { metros, preset, material } of byKey.values()) {
    if (metros <= 0) continue;
    const qty = Math.round(metros * 100) / 100;
    const refBase =
      stripMaterialThicknessLabel(preset.nome).replace(/\s*[\u00d7xX]\s*$/i, "").trim() ||
      preset.tipo ||
      "Orla";
    rows.push({
      material,
      ref: formatOrlaRefForPdf(refBase, preset.espessuraMm),
      medida: `${qty.toFixed(2)} m`,
      quantidade: qty,
      preco: preset.precoPorMetro,
    });
  }
  return rows.sort(
    (a, b) =>
      a.material.localeCompare(b.material, "pt") || a.ref.localeCompare(b.ref, "pt")
  );
}
