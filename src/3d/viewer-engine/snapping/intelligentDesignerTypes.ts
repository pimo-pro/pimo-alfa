import type { AutoLayoutPlan } from "../autoLayout/autoLayoutTypes";

export type RoomSemanticType = "kitchen" | "living" | "bedroom" | "office" | "unknown";

export type DesignProfile = "functional" | "minimal" | "spaceOptimized";

export type DesignVariantId = "A" | "B" | "C";

export type VariationKind = "moreFreeSpace" | "moreStorage" | "moreSymmetry" | "moreDepth";

export type SemanticWallRole = "primary" | "secondary" | "circulation" | "work";

export type SemanticRoomContext = {
  roomType: RoomSemanticType;
  confidence: number;
  primaryWallId: number;
  secondaryWallId: number;
  circulationWallIds: number[];
  workZoneWallId: number;
  openingCount: number;
  doorCount: number;
  windowCount: number;
  obstacleCount: number;
  boxCount: number;
  avgModuleHeightMm: number;
  hints: string[];
};

export type IntelligentDesign = {
  id: DesignVariantId;
  profile: DesignProfile;
  label: string;
  description: string;
  plan: AutoLayoutPlan;
  ergonomicsScore: number;
};

export type LayoutVariation = {
  kind: VariationKind;
  label: string;
  plan: AutoLayoutPlan;
  baseDesignId: DesignVariantId;
};

export type EnvironmentStyleId =
  | "modern"
  | "nordic"
  | "industrial"
  | "minimalist"
  | "classic"
  | "scandinavian"
  | "japandi"
  | "luxury";

export type DesignerPreferences = {
  preferFlushFront: number;
  preferTallModules: number;
  preferSymmetry: number;
  preferStorage: number;
  preferFreeSpace: number;
  chosenDesignCounts: Record<DesignVariantId, number>;
  chosenVariationCounts: Partial<Record<VariationKind, number>>;
  chosenStyleCounts: Partial<Record<EnvironmentStyleId, number>>;
  lastChosenDesignId: DesignVariantId | null;
  preferredStyleId: EnvironmentStyleId | null;
};

export const DEFAULT_DESIGNER_PREFERENCES: DesignerPreferences = {
  preferFlushFront: 0.5,
  preferTallModules: 0.5,
  preferSymmetry: 0.5,
  preferStorage: 0.5,
  preferFreeSpace: 0.5,
  chosenDesignCounts: { A: 0, B: 0, C: 0 },
  chosenVariationCounts: {},
  chosenStyleCounts: {},
  lastChosenDesignId: null,
  preferredStyleId: null,
};

/** Ergonomia cozinha — distâncias mínimas (mm). */
export const ERGONOMICS = {
  baseCabinetHeightMm: 720,
  workTriangleMinMm: 1200,
  workTriangleMaxMm: 2600,
  doorClearanceMm: 600,
  drawerClearanceMm: 450,
  wallModuleGapMinMm: 50,
} as const;
