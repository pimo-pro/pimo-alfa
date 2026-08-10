/**
 * Regras industriais do Nesting V4 (visual/análise).
 * SSOT editável via /admin/industrial/ — não altera writer «mo» nem pipeline CNC.
 */

const STORAGE_KEY = "pimo_nesting_v4_rules_v1";

export type NestingV4EngineId = "pro" | "experimental" | "deepnest";

export type NestingV4Rules = {
  /** Motor por omissão na estação visual. */
  defaultEngine: NestingV4EngineId;
  /** Margem interna da chapa (mm). */
  marginMm: number;
  /** Kerf / espaçamento entre peças (mm). */
  kerfMm: number;
  rotation: {
    /** Permitir 0°/90°. */
    allow90: boolean;
    /** Preferir rotação agressiva no scoring. */
    preferAggressive: boolean;
    /** Respeitar grain YY / lockWoodGrain. */
    respectGrainLock: boolean;
  };
  distribution: {
    priorityMode: "sheets" | "waste" | "balanced";
    groupByThicknessOnly: boolean;
  };
  grain: {
    /** YY = veio fixo. */
    lockYy: boolean;
    /** Mostrar hachura de veio no canvas. */
    showHatch: boolean;
  };
  piecePriority: {
    /** Ordenação inicial: area_desc | width_desc | height_desc */
    sortMode: "area_desc" | "width_desc" | "height_desc";
  };
  compaction: {
    minUtilizationPercent: number;
    /** Mostrar % desperdício na UI. */
    showWasteOverlay: boolean;
  };
};

export const DEFAULT_NESTING_V4_RULES: NestingV4Rules = {
  defaultEngine: "experimental",
  marginMm: 10,
  kerfMm: 3,
  rotation: {
    allow90: true,
    preferAggressive: true,
    respectGrainLock: true,
  },
  distribution: {
    priorityMode: "balanced",
    groupByThicknessOnly: true,
  },
  grain: {
    lockYy: true,
    showHatch: true,
  },
  piecePriority: {
    sortMode: "area_desc",
  },
  compaction: {
    minUtilizationPercent: 0.88,
    showWasteOverlay: true,
  },
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function normalizeNestingV4Rules(raw: unknown): NestingV4Rules {
  const base = DEFAULT_NESTING_V4_RULES;
  if (!isObject(raw)) return { ...base, rotation: { ...base.rotation }, distribution: { ...base.distribution }, grain: { ...base.grain }, piecePriority: { ...base.piecePriority }, compaction: { ...base.compaction } };
  const rot = isObject(raw.rotation) ? raw.rotation : {};
  const dist = isObject(raw.distribution) ? raw.distribution : {};
  const grain = isObject(raw.grain) ? raw.grain : {};
  const prio = isObject(raw.piecePriority) ? raw.piecePriority : {};
  const comp = isObject(raw.compaction) ? raw.compaction : {};
  return {
    defaultEngine:
      raw.defaultEngine === "pro"
        ? "pro"
        : raw.defaultEngine === "deepnest"
          ? "deepnest"
          : "experimental",
    marginMm: Number.isFinite(Number(raw.marginMm)) ? Math.max(0, Number(raw.marginMm)) : base.marginMm,
    kerfMm: Number.isFinite(Number(raw.kerfMm)) ? Math.max(0, Number(raw.kerfMm)) : base.kerfMm,
    rotation: {
      allow90: rot.allow90 !== false,
      preferAggressive: rot.preferAggressive !== false,
      respectGrainLock: rot.respectGrainLock !== false,
    },
    distribution: {
      priorityMode:
        dist.priorityMode === "sheets" || dist.priorityMode === "waste" ? dist.priorityMode : "balanced",
      groupByThicknessOnly: dist.groupByThicknessOnly !== false,
    },
    grain: {
      lockYy: grain.lockYy !== false,
      showHatch: grain.showHatch !== false,
    },
    piecePriority: {
      sortMode:
        prio.sortMode === "width_desc" || prio.sortMode === "height_desc" ? prio.sortMode : "area_desc",
    },
    compaction: {
      minUtilizationPercent: Number.isFinite(Number(comp.minUtilizationPercent))
        ? Math.min(0.99, Math.max(0.5, Number(comp.minUtilizationPercent)))
        : base.compaction.minUtilizationPercent,
      showWasteOverlay: comp.showWasteOverlay !== false,
    },
  };
}

export function loadNestingV4Rules(): NestingV4Rules {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeNestingV4Rules(null);
    return normalizeNestingV4Rules(JSON.parse(raw));
  } catch {
    return normalizeNestingV4Rules(null);
  }
}

export function saveNestingV4Rules(rules: NestingV4Rules): NestingV4Rules {
  const normalized = normalizeNestingV4Rules(rules);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore quota */
  }
  return normalized;
}

export function resolveNestingV4Rules(): NestingV4Rules {
  return loadNestingV4Rules();
}
