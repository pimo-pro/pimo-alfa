import type { ProjectRoomConfig } from "../../3d/viewer-engine/room/roomEngineTypes";
import { getBaseCabinetById } from "../baseCabinets";
import {
  CORNER_LOWER_ID,
  CORNER_UPPER_ID,
  catalogIdForLowerWidth,
  catalogIdForUpperWidth,
  SPECIAL_CATALOG,
} from "./moduleCatalog";
import type {
  AutoFillFinishSpec,
  AutoFillPlan,
  AutoFillPlacedModule,
  AutoFillWallSummary,
} from "./autoRoomFillTypes";
import { analyzeRoomWalls, detectRoomCorners, runAlongToWorld } from "./roomAnalysis";
import type { AnalyzedWallRun } from "./autoRoomFillTypes";
import { packWallSpan } from "./wallPacking";

const CORNER_RESERVE_MM = 900;
const UPPER_FLOOR_MM = 1500;
const UPPER_GAP_MM = 680;

function lowerCenterY(heightMm: number): number {
  return heightMm / 2;
}

function upperCenterY(lowerHeightMm: number, upperHeightMm: number): number {
  return lowerHeightMm + UPPER_GAP_MM + upperHeightMm / 2;
}

function placeAlongRun(
  run: AnalyzedWallRun,
  alongStartMm: number,
  widthMm: number,
  depthMm: number,
  centerY_mm: number
): Pick<AutoFillPlacedModule, "posicaoX_mm" | "posicaoZ_mm" | "posicaoY_mm"> {
  const centerAlong = alongStartMm + widthMm / 2;
  const world = runAlongToWorld(run, centerAlong, depthMm, centerY_mm * 2);
  return {
    posicaoX_mm: world.x,
    posicaoY_mm: centerY_mm,
    posicaoZ_mm: world.z,
  };
}

function fillSegmentOnWall(
  run: AnalyzedWallRun,
  segmentStart: number,
  segmentLength: number,
  tier: "lower" | "upper",
  cornerAtStart: boolean,
  specials: Array<{ kind: import("./autoRoomFillTypes").AutoFillSpecialKind; alongMm: number; widthMm: number }>
): { modules: AutoFillPlacedModule[]; finishes: AutoFillFinishSpec[]; cursorEnd: number } {
  const modules: AutoFillPlacedModule[] = [];
  const finishes: AutoFillFinishSpec[] = [];
  let cursor = segmentStart;
  const isUpper = tier === "upper";

  if (cornerAtStart && segmentLength >= CORNER_RESERVE_MM + 400) {
    const cornerId = isUpper ? CORNER_UPPER_ID : CORNER_LOWER_ID;
    const model = getBaseCabinetById(cornerId);
    const w = model?.widthMm ?? CORNER_RESERVE_MM;
    const h = model?.heightMm ?? 720;
    const d = model?.depthMm ?? 600;
    const pos = placeAlongRun(run, cursor, w, d, isUpper ? upperCenterY(720, h) : lowerCenterY(h));
    modules.push({
      catalogId: cornerId,
      role: "corner",
      wallId: run.wallId,
      rotacaoY_rad: run.rotacaoY_rad,
      ...pos,
    });
    finishes.push({
      boxIndex: modules.length - 1,
      remateL: true,
      hematiDir: !isUpper,
      hematiEsq: !isUpper,
      hematiCima: isUpper,
      rodapeSimple: !isUpper,
    });
    cursor += w;
  }

  const specialsHere = specials
    .filter((s) => s.alongMm >= segmentStart && s.alongMm < segmentStart + segmentLength)
    .sort((a, b) => a.alongMm - b.alongMm);

  for (const special of specialsHere) {
    if (special.alongMm > cursor + 50) {
      const gap = special.alongMm - cursor;
      const packed = packWallSpan(gap, tier);
      for (const width of packed.widthsMm) {
        const catalogId = isUpper ? catalogIdForUpperWidth(width) : catalogIdForLowerWidth(width);
        const model = getBaseCabinetById(catalogId);
        const h = model?.heightMm ?? 720;
        const d = model?.depthMm ?? 600;
        const pos = placeAlongRun(
          run,
          cursor,
          width,
          d,
          isUpper ? upperCenterY(720, h) : lowerCenterY(h)
        );
        modules.push({
          catalogId,
          role: isUpper ? "upper" : "lower",
          wallId: run.wallId,
          rotacaoY_rad: run.rotacaoY_rad,
          ...pos,
        });
        finishes.push({
          boxIndex: modules.length - 1,
          remateDir: true,
          hematiDir: !isUpper,
          hematiEsq: !isUpper,
          hematiCima: isUpper,
          rodapeSimple: !isUpper,
        });
        cursor += width;
      }
    }
    const spec = SPECIAL_CATALOG[special.kind];
    const catalogId = isUpper && spec.upperId ? spec.upperId : spec.lowerId;
    const model = getBaseCabinetById(catalogId);
    const w = model?.widthMm ?? spec.widthMm;
    const h = model?.heightMm ?? 720;
    const d = model?.depthMm ?? 600;
    const pos = placeAlongRun(
      run,
      special.alongMm,
      w,
      d,
      isUpper ? upperCenterY(720, h) : lowerCenterY(h)
    );
    modules.push({
      catalogId,
      role: "special",
      specialKind: special.kind,
      wallId: run.wallId,
      rotacaoY_rad: run.rotacaoY_rad,
      ...pos,
    });
    finishes.push({
      boxIndex: modules.length - 1,
      remateDir: true,
      hematiDir: !isUpper,
      hematiEsq: !isUpper,
      hematiCima: isUpper,
      rodapeSimple: !isUpper,
    });
    cursor = special.alongMm + w;
  }

  const remaining = segmentStart + segmentLength - cursor;
  const packed = packWallSpan(remaining, tier);
  for (let i = 0; i < packed.widthsMm.length; i++) {
    const width = packed.widthsMm[i];
    const trim =
      i === packed.widthsMm.length - 1 && packed.trimLastMm ? packed.trimLastMm : undefined;
    const catalogId = isUpper ? catalogIdForUpperWidth(width) : catalogIdForLowerWidth(width);
    const model = getBaseCabinetById(catalogId);
    const h = model?.heightMm ?? 720;
    const d = model?.depthMm ?? 600;
    const pos = placeAlongRun(
      run,
      cursor,
      width,
      d,
      isUpper ? upperCenterY(720, h) : lowerCenterY(h)
    );
    modules.push({
      catalogId,
      role: isUpper ? "upper" : "lower",
      wallId: run.wallId,
      rotacaoY_rad: run.rotacaoY_rad,
      trimWidthMm: trim,
      ...pos,
    });
    finishes.push({
      boxIndex: modules.length - 1,
      remateDir: true,
      remateEsq: i === 0 && !cornerAtStart,
      hematiDir: !isUpper,
      hematiEsq: !isUpper,
      hematiCima: isUpper,
      rodapeSimple: !isUpper,
    });
    cursor += width;
  }

  return { modules, finishes, cursorEnd: cursor };
}

function buildSpecialsForPrimaryWall(run: AnalyzedWallRun): Array<{
  kind: import("./autoRoomFillTypes").AutoFillSpecialKind;
  alongMm: number;
  widthMm: number;
}> {
  const span = run.runEndMm - run.runStartMm;
  const center = run.runStartMm + span / 2;
  return [
    { kind: "fridge", alongMm: run.runStartMm + 50, widthMm: 900 },
    { kind: "sink", alongMm: run.runStartMm + span * 0.28, widthMm: 800 },
    { kind: "cooktop", alongMm: center - 300, widthMm: 600 },
    { kind: "oven", alongMm: center + 350, widthMm: 600 },
  ];
}

export function generateAutoRoomFillPlan(room: ProjectRoomConfig | null): AutoFillPlan | null {
  if (!room?.walls?.length) return null;

  const wallRuns = analyzeRoomWalls(room);
  if (!wallRuns.length) return null;

  const corners = detectRoomCorners(room);
  const primary =
    wallRuns.reduce((best, run) => {
      const bestLen = best.segments.reduce((m, s) => m + s.lengthMm, 0);
      const len = run.segments.reduce((m, s) => m + s.lengthMm, 0);
      return len > bestLen ? run : best;
    }, wallRuns[0]) ?? wallRuns[0];

  const primarySpecials = buildSpecialsForPrimaryWall(primary);

  const allModules: AutoFillPlacedModule[] = [];
  const allFinishes: AutoFillFinishSpec[] = [];
  const wallSummaries: AutoFillWallSummary[] = [];
  let finishOffset = 0;

  for (const run of wallRuns) {
    const isPrimary = run.wallId === primary.wallId;
    const specials = isPrimary ? primarySpecials : [];
    let wallModuleCount = 0;
    let usefulTotal = 0;

    for (const segment of run.segments) {
      usefulTotal += segment.lengthMm;

      const lower = fillSegmentOnWall(run, segment.startMm, segment.lengthMm, "lower", run.cornerAtStart, specials);
      lower.finishes.forEach((f) => allFinishes.push({ ...f, boxIndex: f.boxIndex + finishOffset }));
      finishOffset += lower.modules.length;
      allModules.push(...lower.modules);
      wallModuleCount += lower.modules.length;

      const upper = fillSegmentOnWall(run, segment.startMm, segment.lengthMm, "upper", run.cornerAtStart, []);
      upper.finishes.forEach((f) => allFinishes.push({ ...f, boxIndex: f.boxIndex + finishOffset }));
      finishOffset += upper.modules.length;
      allModules.push(...upper.modules);
      wallModuleCount += upper.modules.length;
    }

    if (isPrimary) {
      const hoodModel = getBaseCabinetById(SPECIAL_CATALOG.hood.upperId!);
      const w = hoodModel?.widthMm ?? 600;
      const h = hoodModel?.heightMm ?? 720;
      const d = hoodModel?.depthMm ?? 350;
      const along = primary.runStartMm + (primary.runEndMm - primary.runStartMm) / 2 - w / 2;
      const pos = placeAlongRun(primary, along, w, d, UPPER_FLOOR_MM + h / 2);
      allModules.push({
        catalogId: SPECIAL_CATALOG.hood.upperId!,
        role: "special",
        specialKind: "hood",
        wallId: primary.wallId,
        rotacaoY_rad: primary.rotacaoY_rad,
        ...pos,
      });
      allFinishes.push({
        boxIndex: allModules.length - 1,
        remateDir: true,
        hematiCima: true,
      });
      wallModuleCount += 1;
    }

    wallSummaries.push({
      wallId: run.wallId,
      wallLabel: run.label,
      usefulLengthMm: Math.round(usefulTotal),
      moduleCount: wallModuleCount,
    });
  }

  const lowerCount = allModules.filter((m) => m.role === "lower" || m.role === "corner" || (m.role === "special" && m.specialKind !== "hood")).length;
  const upperCount = allModules.filter((m) => m.role === "upper" || m.specialKind === "hood").length;

  const summaryLines = [
    `Paredes preenchidas: ${wallSummaries.length}`,
    `Módulos inferiores / especiais: ${lowerCount}`,
    `Módulos superiores: ${upperCount}`,
    `Cantos detectados: ${corners.length}`,
    `Hemati, roda pé e remates serão gerados automaticamente.`,
  ];

  return {
    modules: allModules,
    finishes: allFinishes,
    wallSummaries,
    corners,
    summaryLines,
  };
}
