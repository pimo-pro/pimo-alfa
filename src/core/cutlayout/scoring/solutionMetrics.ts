import type { CutPlacement, SheetDefinition, SheetResult } from "../cutLayoutTypes";
import type { SheetAdvancedMetrics } from "./advancedMetrics";

export type GlobalScoreMetrics = {
  usedArea: number;
  wasteArea: number;
  usefulLeftoverArea: number;
  score: number;
  advanced: {
    convexHullWasteTotal: number;
    fragmentationScoreTotal: number;
    pocketsCountTotal: number;
    linearGapScoreTotal: number;
    compactnessScoreTotal: number;
    usefulRectangularScrapScoreTotal: number;
    perSheet: SheetAdvancedMetrics[];
  };
};

export function computeSolutionMetrics(
  sheets: SheetResult[],
  sheet: SheetDefinition,
  scoreModel: "legacy" | "v32",
  deps: {
    estimateUsefulLeftover: (
      _sheet: SheetDefinition,
      _placed: Array<{ x: number; y: number; w: number; h: number }>
    ) => number;
    computeSheetAdvancedMetrics: (_sheet: SheetDefinition, _placements: CutPlacement[]) => SheetAdvancedMetrics;
  }
): GlobalScoreMetrics {
  const sheetArea = Math.max(1, sheet.largura_mm * sheet.altura_mm);
  const usedArea = sheets.reduce((acc, s) => acc + s.placements.reduce((a, p) => a + p.largura_mm * p.altura_mm, 0), 0);
  const usefulLeftoverArea = sheets.reduce((acc, s) => {
    const rects = s.placements.map((p) => ({ x: p.x_mm, y: p.y_mm, w: p.largura_mm, h: p.altura_mm }));
    return acc + deps.estimateUsefulLeftover(sheet, rects);
  }, 0);
  const wasteArea = sheets.length * sheetArea - usedArea;
  const perSheet = sheets.map((s) => deps.computeSheetAdvancedMetrics(sheet, s.placements));
  const convexHullWasteTotal = perSheet.reduce((acc, p) => acc + p.convexHullWaste, 0);
  const fragmentationScoreTotal = perSheet.reduce((acc, p) => acc + p.fragmentationScore, 0);
  const pocketsCountTotal = perSheet.reduce((acc, p) => acc + p.pocketsCount, 0);
  const linearGapScoreTotal = perSheet.reduce((acc, p) => acc + p.linearGapScore, 0);
  const compactnessScoreTotal = perSheet.reduce((acc, p) => acc + p.compactnessScore, 0);
  const usefulRectangularScrapScoreTotal = perSheet.reduce((acc, p) => acc + p.usefulRectangularScrapScore, 0);

  let score = sheets.length * 1_000_000 + wasteArea - usefulLeftoverArea * 0.1;
  if (scoreModel === "v32") {
    score += convexHullWasteTotal * 120_000;
    score += fragmentationScoreTotal * 65_000;
    score += pocketsCountTotal * 3_000;
    score += linearGapScoreTotal * 8_000;
    score -= compactnessScoreTotal * 22_000;
    score -= usefulRectangularScrapScoreTotal * 35_000;
  }

  return {
    usedArea,
    wasteArea,
    usefulLeftoverArea,
    score,
    advanced: {
      convexHullWasteTotal,
      fragmentationScoreTotal,
      pocketsCountTotal,
      linearGapScoreTotal,
      compactnessScoreTotal,
      usefulRectangularScrapScoreTotal,
      perSheet,
    },
  };
}
