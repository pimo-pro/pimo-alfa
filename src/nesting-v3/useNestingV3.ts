/**
 * Nesting V3 — Hook de estado da sessão.
 * Toda a lógica de estado está aqui. A UI só chama as acções.
 */

import { useCallback, useEffect, useState } from "react";
import type {
  NestingV3State,
  V3Piece,
  V3Sheet,
  V3DragState,
  V3PiecesByProject,
} from "./nestingV3Types";
import { runNestingV3AutoLayout, getPieceColor } from "./nestingV3Engine";
import type { CutPiece } from "../core/cutlayout/cutLayoutTypes";

// ── Sheet padrão ──────────────────────────────────────────────────────────────

const DEFAULT_SHEET: V3Sheet = {
  index: 0,
  widthMm: 2800,
  heightMm: 2070,
  thicknessMm: 19,
  materialName: "Folha padrão",
};

function makeDefaultState(): NestingV3State {
  return {
    sheets: [{ ...DEFAULT_SHEET }],
    pieces: [],
    placements: [],
    unplacedPieceIds: [],
    kerfMm: 4,
    activeSheetIndex: 0,
  };
}

function stateFromV3Pieces(pieces: V3Piece[]): NestingV3State {
  const base = makeDefaultState();
  return {
    ...base,
    pieces,
    unplacedPieceIds: pieces.map((piece) => piece.id),
  };
}

let _pieceIdCounter = 1;
function nextPieceId() { return `v3p-${_pieceIdCounter++}`; }

// ── Converter CutPiece → V3Piece ──────────────────────────────────────────────

export function cutPieceToV3(cp: CutPiece, index: number): V3Piece {
  const holes = (cp.drillHoles ?? cp.holes ?? []).map((h) => ({
    x: h.x, y: h.y, diameter: h.diameter, depth: h.depth, holeType: h.holeType,
  }));
  return {
    id: nextPieceId(),
    name: cp.partName,
    widthMm: cp.largura_mm,
    heightMm: cp.altura_mm,
    thicknessMm: cp.espessura_mm,
    materialId: cp.materialId,
    materialName: cp.materialName,
    originalHoles: holes,
    rotation: 0,
    color: getPieceColor(cp.materialId, index),
    sourceBoxId: cp.boxId,
  };
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useNestingV3(initialCutPieces: CutPiece[] = []) {
  const [state, setState] = useState<NestingV3State>(() => {
    const base = makeDefaultState();
    if (initialCutPieces.length === 0) return base;
    // Expand quantities
    const pieces: V3Piece[] = [];
    let idx = 0;
    for (const cp of initialCutPieces) {
      const qty = cp.quantidade ?? 1;
      for (let q = 0; q < qty; q++) {
        pieces.push(cutPieceToV3(cp, idx++));
      }
    }
    return { ...base, pieces, unplacedPieceIds: pieces.map((p) => p.id) };
  });

  const [dragState, setDragState] = useState<V3DragState | null>(null);

  const loadPieces = useCallback((pieces: V3Piece[]) => {
    setState(stateFromV3Pieces(pieces));
    setDragState(null);
  }, []);

  const loadMultipleProjects = useCallback((_piecesByProject: V3PiecesByProject) => {
    /* preparado para fase multi-projeto */
  }, []);

  const assignProjectColor = useCallback((_projectId: string) => {
    return undefined as string | undefined;
  }, []);

  const generateOutputsGroupedByProject = useCallback(() => {
    return undefined;
  }, []);

  useEffect(() => {
    if (initialCutPieces.length === 0) return;
    const pieces: V3Piece[] = [];
    let idx = 0;
    for (const cp of initialCutPieces) {
      const qty = cp.quantidade ?? 1;
      for (let q = 0; q < qty; q++) pieces.push(cutPieceToV3(cp, idx++));
    }
    loadPieces(pieces);
  }, [initialCutPieces, loadPieces]);

  // ── Auto-layout ─────────────────────────────────────────────────────────────

  const runAutoLayout = useCallback(() => {
    setState((prev) => {
      const result = runNestingV3AutoLayout(prev.pieces, prev.sheets, prev.kerfMm);
      // Add sheets if engine needed more
      const newSheets = [...prev.sheets];
      while (newSheets.length < result.sheetsUsed) {
        newSheets.push({ ...DEFAULT_SHEET, index: newSheets.length });
      }
      const rotatedById = new Map(result.placements.map((placement) => [placement.pieceId, placement.rotated === true]));
      return {
        ...prev,
        sheets: newSheets,
        pieces: prev.pieces.map((piece) => {
          const rotated = rotatedById.get(piece.id);
          if (rotated == null) return piece;
          return { ...piece, rotation: rotated ? 90 : 0 };
        }),
        placements: result.placements,
        unplacedPieceIds: result.unplacedPieceIds,
      };
    });
  }, []);

  // ── Move piece on sheet ─────────────────────────────────────────────────────

  const movePiece = useCallback((
    pieceId: string,
    sheetIndex: number,
    xMm: number,
    yMm: number
  ) => {
    setState((prev) => {
      const placements = prev.placements.filter((p) => p.pieceId !== pieceId);
      placements.push({ pieceId, sheetIndex, xMm: Math.max(0, xMm), yMm: Math.max(0, yMm) });
      const unplaced = prev.unplacedPieceIds.filter((id) => id !== pieceId);
      return { ...prev, placements, unplacedPieceIds: unplaced };
    });
  }, []);

  // ── Remove from sheet → back to sidebar ────────────────────────────────────

  const returnToSidebar = useCallback((pieceId: string) => {
    setState((prev) => ({
      ...prev,
      placements: prev.placements.filter((p) => p.pieceId !== pieceId),
      unplacedPieceIds: prev.unplacedPieceIds.includes(pieceId)
        ? prev.unplacedPieceIds
        : [...prev.unplacedPieceIds, pieceId],
    }));
  }, []);

  // ── Rotate piece ────────────────────────────────────────────────────────────

  const rotatePiece = useCallback((pieceId: string) => {
    setState((prev) => ({
      ...prev,
      pieces: prev.pieces.map((p) => {
        if (p.id !== pieceId) return p;
        const next = ((p.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        return { ...p, rotation: next };
      }),
    }));
  }, []);

  // ── Move piece to different sheet ──────────────────────────────────────────

  const movePieceToSheet = useCallback((pieceId: string, targetSheetIndex: number) => {
    setState((prev) => {
      const existing = prev.placements.find((p) => p.pieceId === pieceId);
      if (!existing) return prev;
      const placements = prev.placements.map((p) =>
        p.pieceId === pieceId ? { ...p, sheetIndex: targetSheetIndex, xMm: 0, yMm: 0 } : p
      );
      return { ...prev, placements };
    });
  }, []);

  // ── Add piece manually ──────────────────────────────────────────────────────

  const addManualPiece = useCallback((
    name: string,
    widthMm: number,
    heightMm: number,
    thicknessMm: number
  ) => {
    setState((prev) => {
      const piece: V3Piece = {
        id: nextPieceId(),
        name: name || `Peça ${prev.pieces.length + 1}`,
        widthMm,
        heightMm,
        thicknessMm,
        originalHoles: [],
        rotation: 0,
        color: getPieceColor(undefined, prev.pieces.length),
      };
      return {
        ...prev,
        pieces: [...prev.pieces, piece],
        unplacedPieceIds: [...prev.unplacedPieceIds, piece.id],
      };
    });
  }, []);

  // ── Remove piece entirely ───────────────────────────────────────────────────

  const removePiece = useCallback((pieceId: string) => {
    setState((prev) => ({
      ...prev,
      pieces: prev.pieces.filter((p) => p.id !== pieceId),
      placements: prev.placements.filter((p) => p.pieceId !== pieceId),
      unplacedPieceIds: prev.unplacedPieceIds.filter((id) => id !== pieceId),
    }));
  }, []);

  // ── Add / remove sheets ─────────────────────────────────────────────────────

  const addSheet = useCallback(() => {
    setState((prev) => ({
      ...prev,
      sheets: [...prev.sheets, { ...DEFAULT_SHEET, index: prev.sheets.length }],
    }));
  }, []);

  const removeSheet = useCallback((sheetIndex: number) => {
    setState((prev) => {
      const piecesOnSheet = prev.placements
        .filter((p) => p.sheetIndex === sheetIndex)
        .map((p) => p.pieceId);
      return {
        ...prev,
        sheets: prev.sheets.filter((_, i) => i !== sheetIndex).map((s, i) => ({ ...s, index: i })),
        placements: prev.placements.filter((p) => p.sheetIndex !== sheetIndex).map((p) =>
          p.sheetIndex > sheetIndex ? { ...p, sheetIndex: p.sheetIndex - 1 } : p
        ),
        unplacedPieceIds: [...new Set([...prev.unplacedPieceIds, ...piecesOnSheet])],
        activeSheetIndex: Math.min(prev.activeSheetIndex, Math.max(0, prev.sheets.length - 2)),
      };
    });
  }, []);

  const setActiveSheet = useCallback((idx: number) => {
    setState((prev) => ({ ...prev, activeSheetIndex: idx }));
  }, []);

  const setKerfMm = useCallback((v: number) => {
    setState((prev) => ({ ...prev, kerfMm: v }));
  }, []);

  const updateSheet = useCallback((idx: number, patch: Partial<V3Sheet>) => {
    setState((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) => s.index === idx ? { ...s, ...patch } : s),
    }));
  }, []);

  const clearAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      placements: [],
      unplacedPieceIds: prev.pieces.map((p) => p.id),
    }));
  }, []);

  return {
    state,
    dragState,
    setDragState,
    loadPieces,
    loadMultipleProjects,
    assignProjectColor,
    generateOutputsGroupedByProject,
    runAutoLayout,
    movePiece,
    returnToSidebar,
    rotatePiece,
    movePieceToSheet,
    addManualPiece,
    removePiece,
    addSheet,
    removeSheet,
    setActiveSheet,
    setKerfMm,
    updateSheet,
    clearAll,
  };
}
