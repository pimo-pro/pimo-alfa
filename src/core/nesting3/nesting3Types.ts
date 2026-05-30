export type Nesting3StrategyName = "ffd" | "skyline" | "shelf" | "blockPacking";
export type Nesting3GrainDirection = "length" | "width" | "none";
export type Nesting3SheetQuality = "excellent" | "good" | "needs-repack";

export type Nesting3Piece = {
  id: string;
  widthMm: number;
  heightMm: number;
  materialId?: string;
  materialName?: string;
  thicknessMm: number;
  allowRotation: boolean;
  grainDirection: Nesting3GrainDirection;
  originalIndex: number;
};

export type Nesting3Sheet = {
  index: number;
  widthMm: number;
  heightMm: number;
  materialId?: string;
  materialName?: string;
  thicknessMm?: number;
};

export type Nesting3Placement = {
  pieceId: string;
  sheetIndex: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotated: boolean;
};

export type Nesting3BoundingBox = {
  pieceId: string;
  rotated: boolean;
  widthMm: number;
  heightMm: number;
  areaMm2: number;
};

export type Nesting3CollisionCache = Map<string, boolean>;

export type Nesting3PreprocessedGroup = {
  key: string;
  pieces: Nesting3Piece[];
  materialId?: string;
  thicknessMm: number;
  allowRotation: boolean;
};

export type Nesting3PreprocessResult = {
  pieces: Nesting3Piece[];
  groups: Nesting3PreprocessedGroup[];
  boundingBoxes: Map<string, Nesting3BoundingBox[]>;
  collisionCache: Nesting3CollisionCache;
};

export type Nesting3StrategyResult = {
  strategy: Nesting3StrategyName;
  placements: Nesting3Placement[];
  unplacedPieceIds: string[];
  sheetsUsed: number;
  elapsedMs: number;
};

export type Nesting3Score = {
  score: number;
  wasteRatio: number;
  fillDensity: number;
  internalHolePenalty: number;
  normalizedTime: number;
  quality: Nesting3SheetQuality;
};

export type Nesting3ScoredResult = Nesting3StrategyResult & {
  scoring: Nesting3Score;
};

export type Nesting3HybridResult = Nesting3ScoredResult & {
  attempts: Nesting3ScoredResult[];
};

export type Nesting3Options = {
  kerfMm: number;
  maxExtraSheets?: number;
  targetScore?: number;
  maxCandidateSteps?: number;
  timeNormalizationMs?: number;
};
