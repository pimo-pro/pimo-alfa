import type { CutlistItemForPieces } from "../cutlayout/cutLayoutEngine";
import type { IndustrialThicknessAdjustment } from "../cnc/industrialThicknessResolution";
import { IndustrialError, buildIndustrialPieceId } from "./IndustrialError";

function resolveBoxIdFromItem(item: CutlistItemForPieces): string {
  const fromField = String((item as { boxId?: unknown }).boxId ?? "").trim();
  if (fromField) return fromField;
  const id = String((item as { id?: unknown }).id ?? "").trim();
  const dash = id.indexOf("-");
  return dash > 0 ? id.slice(0, dash) : "BOX";
}

function resolvePieceIdFromItem(item: CutlistItemForPieces): string {
  const id = String((item as { id?: unknown }).id ?? "").trim();
  if (id) return id.replace(/-/g, "_").toUpperCase();
  const boxId = resolveBoxIdFromItem(item);
  const tipo = String((item as { tipo?: unknown }).tipo ?? item.nome ?? "PECA");
  return buildIndustrialPieceId(boxId, String(tipo));
}

export function industrialErrorFromThicknessIssue(
  issue: IndustrialThicknessAdjustment,
  sampleItem?: CutlistItemForPieces
): IndustrialError {
  const boxId = sampleItem ? resolveBoxIdFromItem(sampleItem) : "BOX";
  const pieceId = sampleItem
    ? resolvePieceIdFromItem(sampleItem)
    : buildIndustrialPieceId(boxId, issue.pieceNames[0] ?? "PECA");

  if (issue.suggestedThicknessMm <= 0 || !issue.suggestedMaterialLabel) {
    return IndustrialError.noSheetAvailable({
      boxId,
      pieceId,
      materialKey: issue.materialKey,
      thicknessMm: issue.requestedThicknessMm,
    });
  }

  return IndustrialError.noSheetAvailable({
    boxId,
    pieceId,
    materialKey: issue.materialKey,
    thicknessMm: issue.requestedThicknessMm,
    suggestedLabel: issue.suggestedMaterialLabel,
    suggestedThicknessMm: issue.suggestedThicknessMm,
  });
}

export function throwFirstUnresolvedThicknessError<T extends CutlistItemForPieces>(
  items: T[],
  unresolved: IndustrialThicknessAdjustment[]
): void {
  if (unresolved.length === 0) return;
  const issue = unresolved[0]!;
  const sample = items.find((item) => {
    const nome = String(item.nome ?? "");
    return issue.pieceNames.some((p) => p === nome || nome.includes(p));
  });
  throw industrialErrorFromThicknessIssue(issue, sample);
}
