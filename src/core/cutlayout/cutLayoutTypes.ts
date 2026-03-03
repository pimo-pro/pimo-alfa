/**
 * Tipos para o Layout de Corte (otimização de chapas).
 * FASE 4 Etapa 8 Parte 3: extensão para material visual, UV e grain.
 */

import type { LayoutVisualMaterial } from "../types";

export type SheetDefinition = {
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
  materialId?: string;
  materialName?: string;
};

export type CutPiece = {
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
  /** Dimensões reais da chapa para este material/lote. */
  sheetWidthMm?: number;
  sheetHeightMm?: number;
  sheetThicknessMm?: number;
  quantidade: number;
  boxId: string;
  partName: string;
  materialId?: string;
  materialName?: string;
  holes?: Array<{
    x: number;
    y: number;
    diameter: number;
    depth: number;
    holeType?: string;
    topDrillable?: boolean;
  }>;
  /** Comprimento ao longo da fibra (length) = horizontal; width = vertical. */
  grainDirection?: "length" | "width";
  /** Material visual para preview / aplicação no Viewer (MaterialLibrary v2). */
  visualMaterial?: LayoutVisualMaterial;
  /** Override de escala UV por peça. */
  uvScaleOverride?: { x: number; y: number };
  /** Override de rotação UV por peça (graus). */
  uvRotationOverride?: number;
  /** Número sequencial da peça (1-99). */
  pieceNumber?: number;
  /** Código curto legível para fábrica (ex.: PRJBXPO1). */
  shortCode?: string;
};

export type CutPlacement = {
  x_mm: number;
  y_mm: number;
  largura_mm: number;
  altura_mm: number;
  rotacao: number;
  sheetIndex: number;
  boxId: string;
  partName: string;
  materialId?: string;
  materialName?: string;
  holes?: Array<{
    x: number;
    y: number;
    diameter: number;
    depth: number;
    holeType?: string;
    topDrillable?: boolean;
  }>;
  /** Número sequencial da peça (1-99). */
  pieceNumber?: number;
  /** Código curto legível para fábrica. */
  shortCode?: string;
  /** Contornos internos (rasgos, recortes) — coordenadas relativas à peça (x_mm, y_mm). No TCN são compensados para dentro (-raio da fresa). */
  innerContours?: Array<{ x_mm: number; y_mm: number; largura_mm: number; altura_mm: number }>;
};

export type SheetResult = {
  sheet: SheetDefinition;
  placements: CutPlacement[];
};

export type CutLayoutResult = {
  sheets: SheetResult[];
  diagnostics?: {
    flow: {
      skylineEnabled: boolean;
      shelfEnabled?: boolean;
      guillotineEnabled?: boolean;
      reorderEnabled: boolean;
      gapFillEnabled: boolean;
      gapFillAttempts: number;
      rescueAttempts: number;
      rotationPreferenceMode: "auto" | "aggressive" | "disabled";
      selectedStrategy?: "skyline" | "shelf" | "guillotine";
      selectedBinHeuristic?: "firstFit" | "bestFit";
    };
    trialRuns?: Array<{
      strategy: "skyline" | "shelf" | "guillotine";
      binHeuristic: "firstFit" | "bestFit";
      sheetCount: number;
      usedArea: number;
      wasteArea: number;
      usefulLeftoverArea: number;
      score: number;
    }>;
    metaHeuristics?: {
      iterations: number;
      bestScore: number;
      initialScore: number;
      improvementPercent: number;
      acceptedMoves: number;
      totalMoves: number;
      initialSolutions?: number;
      winningSeed?: number;
      winningStrategy?: "skyline" | "shelf" | "guillotine";
      winningBinHeuristic?: "firstFit" | "bestFit";
      convexHullWasteBySheet?: number[];
      fragmentationScore?: number;
      pocketsCount?: number;
      linearGapScore?: number;
      compactnessScore?: number;
    };
    rejectedByLimit: Array<{
      partName: string;
      boxId: string;
      largura_mm: number;
      altura_mm: number;
      reason: string;
    }>;
    gapFillPlacements: Array<{
      partName: string;
      boxId: string;
      sheetIndex: number;
      rotacao: number;
      x_mm: number;
      y_mm: number;
      largura_mm: number;
      altura_mm: number;
    }>;
  };
};
