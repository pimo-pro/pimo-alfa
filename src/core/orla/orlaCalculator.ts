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

type CalcInput = {
  boxes: BoxModule[];
  orlaPresets: OrlaPreset[];
  orlaPieces: Record<string, PieceOrlaConfig>;
  orlaJuntoPairs: OrlaJuntoPair[];
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

export function computeOrlaFerragem(input: CalcInput): ProjectFerragemOrla {
  const { boxes, orlaPresets, orlaPieces, orlaJuntoPairs } = input;
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

  for (const box of boxes) {
    const boxNome = box.nome || box.id;
    for (const item of box.cutList ?? []) {
      const pieceId = panelIdFromCutListItem(item);
      const cfg = lookupPieceOrlaConfig(pieceId, orlaPieces);
      if (!cfg) continue;
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
          boxId: box.id,
          boxNome,
          pieceId,
          pieceNome: item.nome,
          tipo: juntoPair ? "orla_junto" : "normal",
        });
        counted.add(ek);
      }
    }
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
  _presets: OrlaPreset[]
): PieceOrlaConfig {
  const existing = lookupPieceOrlaConfig(pieceId, orlaPieces);
  if (existing) return existing;
  if (boxPresetId) {
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

export function buildOrlaPiecesForBox(
  box: BoxModule,
  presetId: string | null,
  current: Record<string, PieceOrlaConfig>
): Record<string, PieceOrlaConfig> {
  const next = { ...current };
  if (!presetId) return next;
  for (const item of box.cutList ?? []) {
    const panelId = panelIdFromCutListItem(item);
    next[panelId] = {
      sides: {
        front: { presetId, enabled: true },
        back: { presetId, enabled: true },
        left: { presetId, enabled: true },
        right: { presetId, enabled: true },
      },
      orlaJunto: current[panelId]?.orlaJunto,
    };
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
