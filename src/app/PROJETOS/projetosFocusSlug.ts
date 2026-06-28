import { applyResultados } from "../../context/projectState";
import { reviveState } from "../../context/projectPersistence";
import type { ProjectState } from "../../context/projectTypes";
import type { CutListItem, CutListItemComPreco } from "../../core/types";
import { piecePrefixForCutLayoutPro } from "../../core/cutlayout/cutLayoutProPieceNaming";
import { resolveNomeIndustrialForEtiqueta, sanitizeIndustrialSegment } from "../../core/etiquetas/industrialDisplayName";
import { buildCutlistItemsForIndustrialExport } from "../../core/fabrication/buildCutlistItemsForIndustrialExport";
import type { RematePiece, RematePieceTipo } from "../../core/remate/rematePieceTypes";
import type { ProjectRodape, RodapeKind } from "../../core/rodape/rodapeTypes";
import type { SavedProjectRecord } from "../../core/projects/types";
import type { ProjetosElementRow } from "./projetosSnapshotGroups";
import { decodeProjetosPageSlug } from "./projetosPageSlug";

export const PROJETOS_STANDALONE_BOX_SLUG = "avulso";

export type ProjetosFocusCatalog = {
  projectName: string;
  rows: ProjetosElementRow[];
  boxSlugToId: Map<string, string>;
  pieceSlugToId: Map<string, string>;
  boxIdToSlug: Map<string, string>;
  pieceIdToSlug: Map<string, string>;
};

function reviveStateFromRecord(snapshot: SavedProjectRecord | null): ProjectState | null {
  if (!snapshot) return null;
  const revived = reviveState(snapshot.snapshot?.projectState);
  if (!revived) return null;
  return applyResultados(revived);
}

function normalizeSlugSegment(value: string): string {
  return sanitizeIndustrialSegment(value).toLowerCase();
}

export function toProjetosBoxSlug(boxNome: string): string {
  return normalizeSlugSegment(boxNome) || "caixa";
}

function remateTipoToPieceSlug(tipo: RematePieceTipo): string {
  const map: Partial<Record<RematePieceTipo, string>> = {
    CIMA: "remate_cima",
    BAIXO: "remate_baixo",
    DIR: "remate_dir",
    ESQ: "remate_esq",
    FRENTE: "remate_frente",
    L: "remate_l",
    RODAPE: "remate_rodape",
    RODAPE_L: "remate_rodape_l",
  };
  return map[tipo] ?? `remate_${normalizeSlugSegment(tipo)}`;
}

function rodapeKindToPieceSlug(kind: RodapeKind, partIndex?: number): string {
  if (kind === "SIMPLE") return "rodape_frontal";
  if (kind === "FULL") return "rodape_full";
  if (kind === "L") return `rodape_l${partIndex ?? 1}`;
  if (kind === "U") return `rodape_u${partIndex ?? 1}`;
  return `rodape_${normalizeSlugSegment(kind)}`;
}

function cutlistPieceSlug(
  item: CutListItem | CutListItemComPreco,
  boxNome: string | undefined,
  projectName: string
): string {
  void resolveNomeIndustrialForEtiqueta(item, projectName, boxNome);
  return piecePrefixForCutLayoutPro(item);
}

function rematePieceSlug(remate: RematePiece): string {
  const fromName = remate.name?.trim();
  if (fromName) {
    const slug = normalizeSlugSegment(fromName);
    if (slug && !slug.startsWith("remate_")) return `remate_${slug}`;
    if (slug) return slug;
  }
  return remateTipoToPieceSlug(remate.tipo);
}

function rodapePieceSlug(rodape: ProjectRodape): string {
  const custom = rodape.nomePersonalizado?.trim() || rodape.name?.trim();
  if (custom) {
    const slug = normalizeSlugSegment(custom);
    if (slug.startsWith("rodape_")) return slug;
    return `rodape_${slug}`;
  }
  return rodapeKindToPieceSlug(rodape.kind, rodape.partIndex);
}

function uniqueSlug(base: string, used: Set<string>): string {
  let slug = base || "peca";
  if (!used.has(slug)) {
    used.add(slug);
    return slug;
  }
  let i = 2;
  while (used.has(`${slug}_${i}`)) i += 1;
  slug = `${slug}_${i}`;
  used.add(slug);
  return slug;
}

function boxNome(state: ProjectState, boxId: string): string {
  const ws = state.workspaceBoxes?.find((b) => b.id === boxId);
  if (ws?.nome?.trim()) return ws.nome.trim();
  return state.boxes.find((b) => b.id === boxId)?.nome?.trim() || boxId;
}

export function buildProjetosFocusCatalog(snapshot: SavedProjectRecord | null): ProjetosFocusCatalog | null {
  const state = reviveStateFromRecord(snapshot);
  if (!state) return null;

  const projectName = snapshot?.name?.trim() || state.projectName?.trim() || "Projeto";
  const rows: ProjetosElementRow[] = [];
  const boxSlugToId = new Map<string, string>();
  const pieceSlugToId = new Map<string, string>();
  const boxIdToSlug = new Map<string, string>();
  const pieceIdToSlug = new Map<string, string>();
  const usedBoxSlugs = new Set<string>();
  const usedPieceSlugsByBox = new Map<string, Set<string>>();

  const registerBox = (boxId: string, nome: string) => {
    if (boxIdToSlug.has(boxId)) return boxIdToSlug.get(boxId)!;
    const slug = uniqueSlug(toProjetosBoxSlug(nome), usedBoxSlugs);
    boxIdToSlug.set(boxId, slug);
    boxSlugToId.set(slug, boxId);
    return slug;
  };

  const registerPiece = (boxKey: string, pieceId: string, baseSlug: string) => {
    const used = usedPieceSlugsByBox.get(boxKey) ?? new Set<string>();
    if (!usedPieceSlugsByBox.has(boxKey)) usedPieceSlugsByBox.set(boxKey, used);
    const slug = uniqueSlug(baseSlug, used);
    const key = `${boxKey}::${slug}`;
    pieceSlugToId.set(key, pieceId);
    pieceIdToSlug.set(pieceId, slug);
    return slug;
  };

  for (const wsBox of state.workspaceBoxes ?? []) {
    const bSlug = registerBox(wsBox.id, wsBox.nome?.trim() || wsBox.id);
    rows.push({
      id: wsBox.id,
      label: wsBox.nome?.trim() || wsBox.id,
      subtitle: `${Math.round(wsBox.dimensoes.largura)}×${Math.round(wsBox.dimensoes.altura)}×${Math.round(wsBox.dimensoes.profundidade)} mm`,
      boxId: wsBox.id,
      boxSlug: bSlug,
      industrialName: bSlug,
    });
  }

  for (const remate of state.remates ?? []) {
    if (!remate.parentBoxId) continue;
    const bSlug = registerBox(remate.parentBoxId, boxNome(state, remate.parentBoxId));
    const pSlug = registerPiece(bSlug, remate.id, rematePieceSlug(remate));
    rows.push({
      id: remate.id,
      label: remate.name?.trim() || remate.tipo,
      subtitle: boxNome(state, remate.parentBoxId),
      boxId: remate.parentBoxId,
      pieceId: remate.id,
      boxSlug: bSlug,
      pieceSlug: pSlug,
      industrialName: pSlug,
    });
  }

  for (const remate of state.remates ?? []) {
    if (remate.parentBoxId) continue;
    const bSlug = PROJETOS_STANDALONE_BOX_SLUG;
    const pSlug = registerPiece(bSlug, remate.id, rematePieceSlug(remate));
    rows.push({
      id: remate.id,
      label: remate.name?.trim() || remate.tipo,
      boxId: undefined,
      pieceId: remate.id,
      boxSlug: bSlug,
      pieceSlug: pSlug,
      industrialName: pSlug,
    });
  }

  for (const rodape of state.rodapes ?? []) {
    const bSlug = registerBox(rodape.parentBoxId, boxNome(state, rodape.parentBoxId));
    const pSlug = registerPiece(bSlug, rodape.id, rodapePieceSlug(rodape));
    rows.push({
      id: rodape.id,
      label: rodape.nomePersonalizado?.trim() || rodape.name?.trim() || rodape.kind,
      subtitle: boxNome(state, rodape.parentBoxId),
      boxId: rodape.parentBoxId,
      pieceId: rodape.id,
      boxSlug: bSlug,
      pieceSlug: pSlug,
      industrialName: pSlug,
    });
  }

  const exportItems = buildCutlistItemsForIndustrialExport({
    rules: state.rules,
    materialId: state.materialId,
    projectName: state.projectName,
    boxes: state.boxes,
    remates: state.remates,
    rodapes: state.rodapes,
    extractedPartsByBoxId: state.extractedPartsByBoxId,
  });

  const exportIds = new Set(exportItems.map((i) => i.id));
  const boxCutlistExtras = (state.boxes ?? []).flatMap((box) =>
    (box.cutListComPreco ?? box.cutList ?? []).filter((item) => !exportIds.has(item.id))
  );
  const allCutlistItems = [...exportItems, ...boxCutlistExtras];

  for (const item of allCutlistItems) {
    if (!item.boxId) continue;
    if (item.tipo === "remate" || item.tipo === "rodape") continue;
    const bSlug = registerBox(item.boxId, boxNome(state, item.boxId));
    const pSlug = registerPiece(
      bSlug,
      item.id,
      cutlistPieceSlug(item, boxNome(state, item.boxId), projectName)
    );
    const isReady = item.sourceType === "glb_importado";
    rows.push({
      id: item.id,
      label: item.nome?.trim() || pSlug,
      subtitle: `${item.tipo ?? "peça"} · ${boxNome(state, item.boxId)}`,
      boxId: item.boxId,
      pieceId: item.id,
      boxSlug: bSlug,
      pieceSlug: pSlug,
      industrialName: pSlug,
      group: isReady ? "ready" : "industrial",
    });
  }

  return {
    projectName,
    rows,
    boxSlugToId,
    pieceSlugToId,
    boxIdToSlug,
    pieceIdToSlug,
  };
}

export function buildProjetosFocusPath(projectSlug: string, row: ProjetosElementRow): string {
  const base = `/PROJETOS/${encodeURIComponent(projectSlug)}`;
  if (!row.boxSlug && !row.boxId) return base;
  const boxPart = encodeURIComponent(row.boxSlug ?? row.boxId ?? "");
  if (!row.pieceSlug && !row.pieceId) return `${base}/${boxPart}`;
  if (row.pieceId === row.boxId && !row.pieceSlug) return `${base}/${boxPart}`;
  return `${base}/${boxPart}/${encodeURIComponent(row.pieceSlug ?? row.pieceId ?? "")}`;
}

function slugMatches(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return normalizeSlugSegment(a) === normalizeSlugSegment(b);
}

export function rowMatchesFocusUrl(
  row: ProjetosElementRow,
  boxSegment: string | undefined,
  pieceSegment: string | undefined
): boolean {
  if (!boxSegment) return false;
  const boxHit =
    slugMatches(row.boxSlug, boxSegment) ||
    slugMatches(row.boxId, boxSegment);
  if (!pieceSegment) {
    return boxHit && row.id === row.boxId && !row.pieceId;
  }
  const pieceHit =
    slugMatches(row.pieceSlug, pieceSegment) ||
    slugMatches(row.pieceId, pieceSegment);
  return boxHit && pieceHit;
}

export type ResolvedProjetosFocus = {
  boxId?: string;
  pieceId?: string;
  boxSlug?: string;
  pieceSlug?: string;
};

export function resolveProjetosFocusFromSegments(
  snapshot: SavedProjectRecord | null,
  boxSegment: string | undefined,
  pieceSegment: string | undefined
): ResolvedProjetosFocus {
  const catalog = buildProjetosFocusCatalog(snapshot);
  if (!catalog || !boxSegment) return {};

  const boxDecoded = decodeProjetosPageSlug(boxSegment);
  let boxId = catalog.boxSlugToId.get(normalizeSlugSegment(boxDecoded));
  if (!boxId) {
    boxId = catalog.rows.find((r) => r.boxId === boxDecoded)?.boxId;
  }
  if (!boxId && boxDecoded === PROJETOS_STANDALONE_BOX_SLUG) {
    if (pieceSegment) {
      const pieceDecoded = decodeProjetosPageSlug(pieceSegment);
      const pieceKey = `${PROJETOS_STANDALONE_BOX_SLUG}::${normalizeSlugSegment(pieceDecoded)}`;
      const pieceId = catalog.pieceSlugToId.get(pieceKey);
      if (pieceId) {
        return {
          boxId: undefined,
          pieceId,
          boxSlug: PROJETOS_STANDALONE_BOX_SLUG,
          pieceSlug: normalizeSlugSegment(pieceDecoded),
        };
      }
    }
    return { boxSlug: PROJETOS_STANDALONE_BOX_SLUG };
  }
  if (!boxId) return {};

  const boxSlug = catalog.boxIdToSlug.get(boxId) ?? normalizeSlugSegment(boxDecoded);

  if (!pieceSegment) {
    return { boxId, boxSlug };
  }

  const pieceDecoded = decodeProjetosPageSlug(pieceSegment);
  const pieceKey = `${boxSlug}::${normalizeSlugSegment(pieceDecoded)}`;
  let pieceId = catalog.pieceSlugToId.get(pieceKey);
  if (!pieceId) {
    pieceId = catalog.rows.find(
      (r) => r.boxId === boxId && (r.pieceId === pieceDecoded || slugMatches(r.pieceSlug, pieceDecoded))
    )?.pieceId;
  }

  return {
    boxId,
    pieceId,
    boxSlug,
    pieceSlug: pieceId ? catalog.pieceIdToSlug.get(pieceId) ?? normalizeSlugSegment(pieceDecoded) : undefined,
  };
}
