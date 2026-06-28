import { buildProjetosFocusCatalog } from '@/app/PROJETOS/projetosFocusSlug';
import { toProjetosPageSlug } from '@/app/PROJETOS/projetosPageSlug';
import { resolveProjetosIndustrialRef } from '@/industrial/integration/projetos/resolveProjetosIndustrialRef';
import { parseBarcode } from '@/industrial/core/barcode/actions';
import { readOfflineProjects } from '@/core/projects/projectsOfflineStore';
import { toSavedRecordFromOffline } from '@/core/projects/projectsMappers';
import { loadTasksByPiece } from '@/industrial/persistence/work-orders/loadWorkOrders';
import type { SavedProjectRecord } from '@/core/projects/types';

import { normalizeIndustrialCode, splitIndustrialCodeList } from './normalizeIndustrialCode';
import type { OperatorPieceLookupResult } from './types';
function matchesCode(candidate: string | null | undefined, code: string): boolean {
  if (!candidate) return false;
  const normalized = candidate.trim();
  if (!normalized) return false;
  return (
    normalized === code ||
    normalized.toLowerCase() === code.toLowerCase() ||
    normalized.includes(code) ||
    code.includes(normalized)
  );
}

function lookupInProject(record: SavedProjectRecord, code: string): OperatorPieceLookupResult | null {
  const catalog = buildProjetosFocusCatalog(record);
  if (!catalog) return null;

  const projectPageSlug = toProjetosPageSlug(record.name?.trim() || 'projeto');

  for (const row of catalog.rows) {
    if (!row.pieceId) continue;

    const ref = resolveProjetosIndustrialRef(
      record,
      projectPageSlug,
      row.boxSlug,
      row.pieceSlug ?? catalog.pieceIdToSlug.get(row.pieceId),
    );

    const candidates = [
      row.pieceId,
      row.industrialName,
      row.label,
      ref?.etiquetaCode,
      ref?.qrPayload,
      ref?.pieceSlug,
    ];

    if (candidates.some((value) => matchesCode(value, code))) {
      return {
        pieceId: row.pieceId,
        projectId: record.id,
        projectName: record.name?.trim() || catalog.projectName,
        boxId: row.boxId,
        boxName: row.label,
        pieceName: row.label,
        etiquetaCode: ref?.etiquetaCode ?? row.industrialName ?? null,
        qrPayload: ref?.qrPayload ?? null,
        projectPageSlug,
        boxSlug: row.boxSlug,
        pieceSlug: ref?.pieceSlug,
      };
    }
  }

  return null;
}

async function lookupRemoteByPieceId(pieceId: string): Promise<OperatorPieceLookupResult | null> {
  try {
    const tasks = await loadTasksByPiece(pieceId);
    if (tasks.length === 0) return null;
    return {
      pieceId,
      projectId: '',
      projectName: '—',
      etiquetaCode: pieceId,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve peça por NQR, código de etiqueta, barcode PC-* ou piece_id.
 * Pesquisa projectos offline; fallback Supabase por piece_id.
 */
export async function resolvePieceByCodeAsync(rawCode: string): Promise<OperatorPieceLookupResult | null> {
  const sync = resolvePieceByCode(rawCode);
  if (sync) return sync;

  const code = normalizeIndustrialCode(rawCode);
  if (!code) return null;

  const barcode = parseBarcode(code);
  if (barcode?.entityType === 'piece' && barcode.id) {
    return lookupRemoteByPieceId(barcode.id);
  }

  return lookupRemoteByPieceId(code);
}

export function resolvePieceByCode(rawCode: string): OperatorPieceLookupResult | null {
  const code = normalizeIndustrialCode(rawCode);  if (!code) return null;

  const barcode = parseBarcode(code);
  if (barcode?.entityType === 'piece' && barcode.id) {
    for (const project of readOfflineProjects().filter((p) => !p.deleted)) {
      const match = lookupInProject(toSavedRecordFromOffline(project), barcode.id);
      if (match) return match;
    }
    return {
      pieceId: barcode.id,
      projectId: '',
      projectName: '—',
      etiquetaCode: code,
    };
  }

  for (const project of readOfflineProjects().filter((p) => !p.deleted)) {
    const match = lookupInProject(toSavedRecordFromOffline(project), code);
    if (match) return match;
  }

  return null;
}

export function resolvePiecesByCodes(rawCodes: string[]): OperatorPieceLookupResult[] {
  const seen = new Set<string>();
  const results: OperatorPieceLookupResult[] = [];

  for (const raw of rawCodes) {
    const parts = splitIndustrialCodeList(raw);

    for (const part of parts.length > 0 ? parts : [normalizeIndustrialCode(raw)]) {
      const resolved = resolvePieceByCode(part);
      if (!resolved || seen.has(resolved.pieceId)) continue;
      seen.add(resolved.pieceId);
      results.push(resolved);
    }
  }

  return results;
}
