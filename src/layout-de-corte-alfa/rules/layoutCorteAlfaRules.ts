/**
 * Regras industriais — Layout de Corte Alfa (simulação CNC visual).
 * Editáveis em /admin/industrial/ — não afectam writer «mo» nem CNC de produção.
 */

const STORAGE_KEY = "pimo_layout_corte_alfa_rules_v1";

export type LcaRules = {
  simulation: {
    defaultSpeed: number;
    showOperationOrder: boolean;
    showAxisGizmo: boolean;
    showOriginMarker: boolean;
  };
  visualization: {
    pathColor: string;
    drillColor: string;
    kerfColor: string;
    wasteOverlayOpacity: number;
    hatchStyle: "dense" | "sparse" | "diagonal";
  };
  analysis: {
    showWastePercent: boolean;
    showUtilization: boolean;
    cutFeedMmPerMin: number;
    drillSecPerHole: number;
  };
  grain: {
    showHatch: boolean;
    yyColor: string;
    xxColor: string;
  };
  cncOrigin: {
    /** Origem máquina: canto superior direito da chapa (simulação). */
    corner: "top-right";
    showMachineAxes: boolean;
    labelAxes: boolean;
  };
};

export const DEFAULT_LCA_RULES: LcaRules = {
  simulation: {
    defaultSpeed: 0.45,
    showOperationOrder: true,
    showAxisGizmo: true,
    showOriginMarker: true,
  },
  visualization: {
    pathColor: "#38bdf8",
    drillColor: "#f472b6",
    kerfColor: "#fbbf24",
    wasteOverlayOpacity: 0.18,
    hatchStyle: "diagonal",
  },
  analysis: {
    showWastePercent: true,
    showUtilization: true,
    cutFeedMmPerMin: 8000,
    drillSecPerHole: 1.2,
  },
  grain: {
    showHatch: true,
    yyColor: "rgba(148,163,184,0.45)",
    xxColor: "rgba(56,189,248,0.35)",
  },
  cncOrigin: {
    corner: "top-right",
    showMachineAxes: true,
    labelAxes: true,
  },
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function normalizeLcaRules(raw: unknown): LcaRules {
  const base = DEFAULT_LCA_RULES;
  if (!isObject(raw)) {
    return structuredClone(base);
  }
  const sim = isObject(raw.simulation) ? raw.simulation : {};
  const viz = isObject(raw.visualization) ? raw.visualization : {};
  const an = isObject(raw.analysis) ? raw.analysis : {};
  const grain = isObject(raw.grain) ? raw.grain : {};
  const origin = isObject(raw.cncOrigin) ? raw.cncOrigin : {};
  const hatch =
    viz.hatchStyle === "dense" || viz.hatchStyle === "sparse" || viz.hatchStyle === "diagonal"
      ? viz.hatchStyle
      : base.visualization.hatchStyle;

  return {
    simulation: {
      defaultSpeed: Math.min(1, Math.max(0.05, Number(sim.defaultSpeed) || base.simulation.defaultSpeed)),
      showOperationOrder: sim.showOperationOrder !== false,
      showAxisGizmo: sim.showAxisGizmo !== false,
      showOriginMarker: sim.showOriginMarker !== false,
    },
    visualization: {
      pathColor: typeof viz.pathColor === "string" ? viz.pathColor : base.visualization.pathColor,
      drillColor: typeof viz.drillColor === "string" ? viz.drillColor : base.visualization.drillColor,
      kerfColor: typeof viz.kerfColor === "string" ? viz.kerfColor : base.visualization.kerfColor,
      wasteOverlayOpacity: Math.min(
        0.5,
        Math.max(0, Number(viz.wasteOverlayOpacity) || base.visualization.wasteOverlayOpacity)
      ),
      hatchStyle: hatch,
    },
    analysis: {
      showWastePercent: an.showWastePercent !== false,
      showUtilization: an.showUtilization !== false,
      cutFeedMmPerMin: Math.max(100, Number(an.cutFeedMmPerMin) || base.analysis.cutFeedMmPerMin),
      drillSecPerHole: Math.max(0.1, Number(an.drillSecPerHole) || base.analysis.drillSecPerHole),
    },
    grain: {
      showHatch: grain.showHatch !== false,
      yyColor: typeof grain.yyColor === "string" ? grain.yyColor : base.grain.yyColor,
      xxColor: typeof grain.xxColor === "string" ? grain.xxColor : base.grain.xxColor,
    },
    cncOrigin: {
      corner: "top-right",
      showMachineAxes: origin.showMachineAxes !== false,
      labelAxes: origin.labelAxes !== false,
    },
  };
}

export function loadLcaRules(): LcaRules {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeLcaRules(null);
    return normalizeLcaRules(JSON.parse(raw));
  } catch {
    return normalizeLcaRules(null);
  }
}

export function saveLcaRules(rules: LcaRules): LcaRules {
  const normalized = normalizeLcaRules(rules);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore */
  }
  return normalized;
}

export function resolveLcaRules(): LcaRules {
  return loadLcaRules();
}
