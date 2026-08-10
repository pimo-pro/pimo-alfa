/**
 * Regras TCN / simulação real — Layout de Corte Alfa.
 * SSOT de parâmetros de visualização e anotações industriais.
 * Não altera o writer «mo» nem o pipeline CNC de produção.
 */

const STORAGE_KEY = "pimo_layout_corte_alfa_tcn_rules_v1";

export type LcaTcnRules = {
  offsets: {
    /** Offset visual de ferramenta (mm) — anotação; kerf real vem do layout V4. */
    toolOffsetMm: number;
    contourOffsetMm: number;
  };
  kerf: {
    /** Kerf preferido ao sincronizar settings antes do export real. */
    preferredKerfMm: number;
    showKerfCompensation: boolean;
  };
  grain: {
    respectGrainLock: boolean;
    showGrainOnPieces: boolean;
  };
  rotation: {
    allow90: boolean;
    /** Industrial CNC: 0/90. */
    onlyOrthogonal: boolean;
  };
  drilling: {
    defaultDepthMm: number;
    showHoleDepth: boolean;
  };
  motion: {
    defaultFeedMmPerMin: number;
    spindleRpm: number;
    zSafeMm: number;
    showZMoves: boolean;
    showFeedrate: boolean;
  };
  display: {
    defaultView: "2d" | "3d";
    pathColor: string;
    rapidColor: string;
    drillColor: string;
    zMoveColor: string;
    lineWidthPx: number;
    simulationSpeed: number;
  };
};

export const DEFAULT_LCA_TCN_RULES: LcaTcnRules = {
  offsets: {
    toolOffsetMm: 0,
    contourOffsetMm: 0,
  },
  kerf: {
    preferredKerfMm: 3,
    showKerfCompensation: true,
  },
  grain: {
    respectGrainLock: true,
    showGrainOnPieces: true,
  },
  rotation: {
    allow90: true,
    onlyOrthogonal: true,
  },
  drilling: {
    defaultDepthMm: 12,
    showHoleDepth: true,
  },
  motion: {
    defaultFeedMmPerMin: 8000,
    spindleRpm: 18000,
    zSafeMm: 25,
    showZMoves: true,
    showFeedrate: true,
  },
  display: {
    defaultView: "2d",
    pathColor: "#38bdf8",
    rapidColor: "#94a3b8",
    drillColor: "#f472b6",
    zMoveColor: "#a78bfa",
    lineWidthPx: 1.6,
    simulationSpeed: 0.5,
  },
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function normalizeLcaTcnRules(raw: unknown): LcaTcnRules {
  const base = DEFAULT_LCA_TCN_RULES;
  if (!isObject(raw)) return structuredClone(base);
  const o = isObject(raw.offsets) ? raw.offsets : {};
  const k = isObject(raw.kerf) ? raw.kerf : {};
  const g = isObject(raw.grain) ? raw.grain : {};
  const r = isObject(raw.rotation) ? raw.rotation : {};
  const d = isObject(raw.drilling) ? raw.drilling : {};
  const m = isObject(raw.motion) ? raw.motion : {};
  const disp = isObject(raw.display) ? raw.display : {};

  return {
    offsets: {
      toolOffsetMm: Math.max(0, Number(o.toolOffsetMm) || 0),
      contourOffsetMm: Math.max(0, Number(o.contourOffsetMm) || 0),
    },
    kerf: {
      preferredKerfMm: Math.max(0, Number(k.preferredKerfMm) || base.kerf.preferredKerfMm),
      showKerfCompensation: k.showKerfCompensation !== false,
    },
    grain: {
      respectGrainLock: g.respectGrainLock !== false,
      showGrainOnPieces: g.showGrainOnPieces !== false,
    },
    rotation: {
      allow90: r.allow90 !== false,
      onlyOrthogonal: r.onlyOrthogonal !== false,
    },
    drilling: {
      defaultDepthMm: Math.max(0.1, Number(d.defaultDepthMm) || base.drilling.defaultDepthMm),
      showHoleDepth: d.showHoleDepth !== false,
    },
    motion: {
      defaultFeedMmPerMin: Math.max(100, Number(m.defaultFeedMmPerMin) || base.motion.defaultFeedMmPerMin),
      spindleRpm: Math.max(1000, Number(m.spindleRpm) || base.motion.spindleRpm),
      zSafeMm: Math.max(1, Number(m.zSafeMm) || base.motion.zSafeMm),
      showZMoves: m.showZMoves !== false,
      showFeedrate: m.showFeedrate !== false,
    },
    display: {
      defaultView: disp.defaultView === "3d" ? "3d" : "2d",
      pathColor: typeof disp.pathColor === "string" ? disp.pathColor : base.display.pathColor,
      rapidColor: typeof disp.rapidColor === "string" ? disp.rapidColor : base.display.rapidColor,
      drillColor: typeof disp.drillColor === "string" ? disp.drillColor : base.display.drillColor,
      zMoveColor: typeof disp.zMoveColor === "string" ? disp.zMoveColor : base.display.zMoveColor,
      lineWidthPx: Math.min(6, Math.max(0.5, Number(disp.lineWidthPx) || base.display.lineWidthPx)),
      simulationSpeed: Math.min(1, Math.max(0.05, Number(disp.simulationSpeed) || base.display.simulationSpeed)),
    },
  };
}

export function loadLcaTcnRules(): LcaTcnRules {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeLcaTcnRules(null);
    return normalizeLcaTcnRules(JSON.parse(raw));
  } catch {
    return normalizeLcaTcnRules(null);
  }
}

export function saveLcaTcnRules(rules: LcaTcnRules): LcaTcnRules {
  const normalized = normalizeLcaTcnRules(rules);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore */
  }
  return normalized;
}
