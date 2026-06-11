import type { AutoLayoutPlan } from "../autoLayout/autoLayoutTypes";
import type { WorkspaceBox } from "../../../core/types";
import {
  buildWallDef,
  computeEvenPlacementsAlongInterval,
  getFreeIntervalsOnWall,
  moduleDepthFromWall,
  moduleWidthOnWall,
  pickLongestInterval,
  placementOnWall,
} from "../autoLayout/autoLayoutRoomGeometry";
import type { AutoLayoutOpeningMm, AutoLayoutRoomBoundsMm } from "../autoLayout/autoLayoutTypes";
import type { DesignerPreferences, SemanticRoomContext } from "./intelligentDesignerTypes";
import { formatMaterialHintForUi } from "./styleMaterialHints";

export type StyleId =
  | "modern"
  | "nordic"
  | "industrial"
  | "minimalist"
  | "classic"
  | "scandinavian"
  | "japandi"
  | "luxury";

export type StyleSymmetry = "low" | "medium" | "high";
export type StyleDensity = "low" | "medium" | "high";

export type StyleProfileDefinition = {
  id: StyleId;
  label: string;
  description: string;
  baseHeightMm: number;
  depthMultiplier: number;
  gapMultiplier: number;
  density: StyleDensity;
  symmetry: StyleSymmetry;
  moduleCountDelta: number;
  continuityRemateRodape: boolean;
  preferPrimaryWall: boolean;
  flushFrontPriority: number;
  compositionNotes: string[];
};

export type StylePlanResult = {
  styleId: StyleId;
  label: string;
  description: string;
  plan: AutoLayoutPlan;
  styleMatchScore: number;
  materialHintLabel: string;
  compositionSummary: string;
};

export type BuildStylePlanInput = {
  styleId: StyleId;
  seedBoxId: string;
  context: SemanticRoomContext;
  bounds: AutoLayoutRoomBoundsMm;
  openings: AutoLayoutOpeningMm[];
  wallOffsetMm: number;
  boxes: WorkspaceBox[];
  prefs: DesignerPreferences;
};

const PROFILES: Record<StyleId, StyleProfileDefinition> = {
  modern: {
    id: "modern",
    label: "Moderno",
    description: "Linhas retas, profundidade média, simetria moderada e continuidade frontal.",
    baseHeightMm: 720,
    depthMultiplier: 1,
    gapMultiplier: 1,
    density: "medium",
    symmetry: "medium",
    moduleCountDelta: 0,
    continuityRemateRodape: true,
    preferPrimaryWall: true,
    flushFrontPriority: 0.85,
    compositionNotes: ["Linhas retas", "Flush frontal", "Simetria moderada"],
  },
  nordic: {
    id: "nordic",
    label: "Nórdico",
    description: "Leveza visual, poucos módulos, espaçamento amplo na parede principal.",
    baseHeightMm: 720,
    depthMultiplier: 0.92,
    gapMultiplier: 1.3,
    density: "low",
    symmetry: "high",
    moduleCountDelta: -1,
    continuityRemateRodape: true,
    preferPrimaryWall: true,
    flushFrontPriority: 0.7,
    compositionNotes: ["Espaçamento maior", "Poucos módulos", "Foco na parede principal"],
  },
  industrial: {
    id: "industrial",
    label: "Industrial",
    description: "Módulos profundos, composição densa, alinhamento rígido e continuidade vertical.",
    baseHeightMm: 720,
    depthMultiplier: 1.15,
    gapMultiplier: 0.85,
    density: "high",
    symmetry: "low",
    moduleCountDelta: 1,
    continuityRemateRodape: true,
    preferPrimaryWall: true,
    flushFrontPriority: 0.9,
    compositionNotes: ["Profundidade aumentada", "Linhas rígidas", "Composição pesada"],
  },
  minimalist: {
    id: "minimalist",
    label: "Minimalista",
    description: "Menos módulos, mais espaço livre, profundidade reduzida.",
    baseHeightMm: 700,
    depthMultiplier: 0.88,
    gapMultiplier: 1.4,
    density: "low",
    symmetry: "high",
    moduleCountDelta: -2,
    continuityRemateRodape: false,
    preferPrimaryWall: true,
    flushFrontPriority: 0.65,
    compositionNotes: ["Máximo espaço livre", "Profundidade reduzida"],
  },
  classic: {
    id: "classic",
    label: "Clássico",
    description: "Proporções equilibradas, simetria elevada e continuidade visual.",
    baseHeightMm: 720,
    depthMultiplier: 1,
    gapMultiplier: 1.1,
    density: "medium",
    symmetry: "high",
    moduleCountDelta: 0,
    continuityRemateRodape: true,
    preferPrimaryWall: true,
    flushFrontPriority: 0.8,
    compositionNotes: ["Simetria elevada", "Ritmo regular"],
  },
  scandinavian: {
    id: "scandinavian",
    label: "Escandinavo",
    description: "Funcional e luminoso — leveza nórdica com foco em madeira clara.",
    baseHeightMm: 720,
    depthMultiplier: 0.9,
    gapMultiplier: 1.25,
    density: "low",
    symmetry: "high",
    moduleCountDelta: -1,
    continuityRemateRodape: true,
    preferPrimaryWall: true,
    flushFrontPriority: 0.72,
    compositionNotes: ["Luminosidade", "Madeira clara sugerida", "Espaçamento generoso"],
  },
  japandi: {
    id: "japandi",
    label: "Japandi",
    description: "Equilíbrio, simetria suave, profundidade média e continuidade lateral.",
    baseHeightMm: 700,
    depthMultiplier: 0.95,
    gapMultiplier: 1.2,
    density: "medium",
    symmetry: "high",
    moduleCountDelta: -1,
    continuityRemateRodape: true,
    preferPrimaryWall: true,
    flushFrontPriority: 0.75,
    compositionNotes: ["Equilíbrio visual", "Simetria suave", "Continuidade lateral"],
  },
  luxury: {
    id: "luxury",
    label: "Luxo",
    description: "Materiais nobres sugeridos, simetria alta e ritmo contido.",
    baseHeightMm: 750,
    depthMultiplier: 1.05,
    gapMultiplier: 1.15,
    density: "medium",
    symmetry: "high",
    moduleCountDelta: 0,
    continuityRemateRodape: true,
    preferPrimaryWall: true,
    flushFrontPriority: 0.88,
    compositionNotes: ["Altura ligeiramente superior", "Simetria premium"],
  },
};

export function getStyleProfile(styleId: StyleId): StyleProfileDefinition {
  return PROFILES[styleId];
}

export function listStyleProfiles(): StyleProfileDefinition[] {
  return Object.values(PROFILES);
}

const ALL_STYLE_IDS = Object.keys(PROFILES) as StyleId[];

export function isEnvironmentStyleId(id: string): id is StyleId {
  return ALL_STYLE_IDS.includes(id as StyleId);
}

export function buildStylePlan(input: BuildStylePlanInput): StylePlanResult | null {
  const profile = PROFILES[input.styleId];
  const module = input.boxes.find((b) => b.id === input.seedBoxId);
  if (!module || module.locked) return null;

  const wallId = input.context.primaryWallId;
  const wall = buildWallDef(wallId, input.bounds, input.wallOffsetMm);
  if (!wall) return null;

  const moduleW = moduleWidthOnWall(module, wall);
  const intervals = getFreeIntervalsOnWall(wall, input.openings, moduleW);
  const interval = pickLongestInterval(intervals);
  if (!interval) return null;

  const span = interval.end - interval.start;
  let count = Math.max(1, Math.floor(span / (moduleW * profile.gapMultiplier)));
  count = applyDensity(count, profile, input.prefs);
  count = Math.max(1, count + profile.moduleCountDelta);

  const effectiveModuleW = moduleW * profile.gapMultiplier;
  const centers = computeEvenPlacementsAlongInterval(interval.start, interval.end, effectiveModuleW, count);

  if (profile.symmetry === "high" && centers.length > 1) {
    symmetrizeCenters(centers, (interval.start + interval.end) / 2);
  }

  const plan: AutoLayoutPlan = { cloneBoxes: [], moveBoxes: [], shelfUpdates: [] };
  const baseY = input.context.roomType === "kitchen" ? input.bounds.minY_mm + profile.baseHeightMm / 2 : module.posicaoY_mm ?? profile.baseHeightMm / 2;

  const depthBase = moduleDepthFromWall(module, wall);
  const depthAdjust = (profile.depthMultiplier - 1) * depthBase * 0.25;

  centers.forEach((along, idx) => {
    const placement = placementOnWall(wall, along, module, input.bounds);
    placement.y_mm = baseY;
    applyDepthNudge(placement, wall, depthAdjust);
    if (idx === 0) {
      plan.moveBoxes.push({ boxId: input.seedBoxId, placement });
    } else {
      plan.cloneBoxes.push({ sourceId: input.seedBoxId, placement });
    }
  });

  if (profile.continuityRemateRodape) {
    plan.shelfUpdates.push({ boxId: input.seedBoxId, count: Math.max(module.prateleiras, 0) });
  }

  const styleMatchScore = scoreStyleMatch(plan, input.context, profile);
  const materialHintLabel = formatMaterialHintForUi(input.styleId);

  return {
    styleId: input.styleId,
    label: `Estilo ${profile.label}`,
    description: profile.description,
    plan,
    styleMatchScore,
    materialHintLabel,
    compositionSummary: profile.compositionNotes.join(" · "),
  };
}

export function scoreStyleMatch(
  plan: AutoLayoutPlan,
  context: SemanticRoomContext,
  profile: StyleProfileDefinition
): number {
  const moduleCount = plan.moveBoxes.length + plan.cloneBoxes.length;
  let score = 65;

  if (profile.density === "low" && moduleCount <= 3) score += 15;
  if (profile.density === "high" && moduleCount >= 4) score += 15;
  if (profile.density === "medium" && moduleCount >= 2 && moduleCount <= 5) score += 12;

  if (profile.symmetry === "high") score += 8;
  if (profile.preferPrimaryWall && context.primaryWallId === context.workZoneWallId) score += 7;
  if (context.roomType === "kitchen" && profile.id !== "minimalist") score += 5;

  return Math.max(0, Math.min(100, score));
}

function applyDensity(count: number, profile: StyleProfileDefinition, prefs: DesignerPreferences): number {
  if (profile.density === "low" || prefs.preferFreeSpace > 0.6) return Math.max(1, count - 1);
  if (profile.density === "high" || prefs.preferStorage > 0.6) return count + 1;
  return count;
}

function symmetrizeCenters(centers: number[], mid: number): void {
  if (centers.length < 2) return;
  const half = Math.floor(centers.length / 2);
  for (let i = 0; i < half; i += 1) {
    const j = centers.length - 1 - i;
    const avg = (centers[i]! + centers[j]!) / 2;
    const spread = Math.abs(centers[j]! - centers[i]!) / 2;
    centers[i] = mid - spread;
    centers[j] = mid + spread;
    void avg;
  }
}

function applyDepthNudge(
  placement: { x_mm: number; y_mm: number; z_mm: number },
  wall: { wallId: number; fixedAxis: "x" | "z" },
  nudgeMm: number
): void {
  if (wall.fixedAxis === "z") {
    placement.z_mm += wall.wallId === 0 ? nudgeMm : -nudgeMm;
  } else {
    placement.x_mm += wall.wallId === 1 ? -nudgeMm : nudgeMm;
  }
}

export function styleIdFromLegacyProfile(
  pref: "minimal" | "functional" | "storage"
): StyleId {
  if (pref === "minimal") return "minimalist";
  if (pref === "storage") return "industrial";
  return "modern";
}
