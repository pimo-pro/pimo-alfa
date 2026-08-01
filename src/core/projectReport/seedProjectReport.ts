/**
 * Seed + merge do Relatorio Final a partir de fontes existentes (so leitura).
 * Merge: adiciona entradas novas; nunca apaga nem sobrescreve campos manuais.
 */

import { applyResultados } from "@/context/projectState";
import { reviveState } from "@/context/projectPersistence";
import type { ProjectState } from "@/context/projectTypes";
import { COMPONENT_TYPES_DEFAULT, type ComponentType } from "@/core/components/componentTypes";
import { FERRAGENS_DEFAULT, type Ferragem } from "@/core/ferragens/ferragens";
import { computeFinanceiroUnificado } from "@/core/financeiro/financeiroUnificado";
import { FINANCEIRO_CUSTO_KEYS } from "@/core/financeiro/financeiroUnificadoTypes";
import { buildFerragensTotaisPdfData } from "@/core/industrial/industrialBottomSectionData";
import {
  resolveEmpresaExecutora,
  resolveMateriaisProjeto,
  resolveProjectDesigner,
} from "@/core/projects/projectMeta";
import { toSavedRecordFromOffline } from "@/core/projects/projectsMappers";
import { readOfflineProjects } from "@/core/projects/projectsOfflineStore";
import { safeGetItem } from "@/utils/storage";
import { resolveProjectCutlistFromRecord } from "@/industrial/work-orders/resolveProjectCutlistFromRecord";

import { ensureFinanceiroShape } from "./financeReportCalc";
import { isManualPath } from "./projectReportStore";
import {
  applyTrakToReportParts,
  importTrakSnapshot,
  trakIntoEmptyMontagem,
  trakIntoEmptyProducao,
} from "./trakImport";
import {
  emptyDesign,
  emptyGerais,
  emptyQualidade,
  makeReportId,
  type ProjectReport,
  type ReportCaixa,
  type ReportMaterialLinha,
  type ReportPeca,
} from "./types";

function loadComponentTypes(): ComponentType[] {
  const raw = safeGetItem("pimo_component_types");
  if (!raw) return COMPONENT_TYPES_DEFAULT;
  try {
    const parsed = JSON.parse(raw) as ComponentType[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : COMPONENT_TYPES_DEFAULT;
  } catch {
    return COMPONENT_TYPES_DEFAULT;
  }
}

function loadFerragens(): Ferragem[] {
  const raw = safeGetItem("pimo_ferragens");
  if (!raw) return FERRAGENS_DEFAULT;
  try {
    const parsed = JSON.parse(raw) as Ferragem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : FERRAGENS_DEFAULT;
  } catch {
    return FERRAGENS_DEFAULT;
  }
}

function findOfflineProject(projectId: string) {
  const id = projectId.trim();
  return (
    readOfflineProjects().find((p) => !p.deleted && (p.id === id || p.remoteId === id)) ?? null
  );
}

function reviveProjectState(projectId: string): {
  state: ProjectState | null;
  name: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
} {
  const offline = findOfflineProject(projectId);
  if (!offline) {
    return { state: null, name: "", ownerName: "", createdAt: "", updatedAt: "" };
  }
  const record = toSavedRecordFromOffline(offline);
  const revived = reviveState(record.snapshot?.projectState);
  const state = revived ? applyResultados(revived) : null;
  return {
    state,
    name: offline.name || state?.projectName || "",
    ownerName: offline.ownerName || "",
    createdAt: offline.createdAt || "",
    updatedAt: offline.updatedAt || "",
  };
}

function toDateInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function buildCaixas(state: ProjectState | null): ReportCaixa[] {
  const boxes = state?.boxes ?? [];
  return boxes.map((b, i) => {
    const d = b.dimensoes;
    const L = Number(d?.largura) || 0;
    const A = Number(d?.altura) || 0;
    const P = Number(b.profundidadeExterna ?? d?.profundidade) || 0;
    return {
      id: makeReportId("cx"),
      sourceId: b.id || `box-${i}`,
      nome: b.nome || b.id || `Caixa ${i + 1}`,
      dimensoes: `${L} x ${A} x ${P} mm`,
      tipo: String(b.cabinetType ?? b.portaTipo ?? "caixa"),
    };
  });
}

function buildPecas(projectId: string): ReportPeca[] {
  const offline = findOfflineProject(projectId);
  if (!offline) return [];
  const ctx = resolveProjectCutlistFromRecord(toSavedRecordFromOffline(offline));
  const items = ctx?.cutListItems ?? [];
  return items.map((item, i) => {
    const L = Number(item.dimensoes?.largura) || 0;
    const A = Number(item.dimensoes?.altura) || 0;
    const E = Number(item.espessura ?? item.dimensoes?.profundidade) || 0;
    return {
      id: makeReportId("pc"),
      sourceId: item.id || `piece-${i}`,
      ref: String(item.shortCode ?? item.id ?? i + 1),
      peca: String(item.nome ?? item.tipo ?? "Peca"),
      material: String(item.material ?? ""),
      matRef: String(item.materialId ?? ""),
      qtd: Number(item.quantidade) || 1,
      comp: L,
      larg: A,
      esp: E,
      cnc: "",
      drill: "",
      o2: "",
      o3: "",
      o4: "",
      o5: "",
      f2: "",
      f3: "",
      f4: "",
      f5: "",
      g: "",
      observacoes: "",
      noEtq: String(item.pieceNumber ?? ""),
      temErro: false,
      notasErro: "",
      propostaCorrecao: "",
    };
  });
}

function buildMateriais(state: ProjectState | null): ReportMaterialLinha[] {
  if (!state) return [];
  try {
    const { porTipo } = buildFerragensTotaisPdfData(state, loadComponentTypes(), loadFerragens());
    return porTipo.map((row, i) => ({
      id: makeReportId("mat"),
      sourceId: `ferr-${i}-${row[0] ?? ""}`,
      tipo: String(row[0] ?? "Ferragem"),
      quantidade: Number(row[1]) || 0,
      observacoes: "",
      temErro: false,
      substituicao: "",
    }));
  } catch {
    return [];
  }
}

function buildFinanceiroFromState(state: ProjectState | null) {
  if (!state) return ensureFinanceiroShape(null);
  try {
    const snap = computeFinanceiroUnificado(state);
    const seed: Partial<Record<(typeof FINANCEIRO_CUSTO_KEYS)[number], number>> = {};
    for (const key of FINANCEIRO_CUSTO_KEYS) {
      seed[key] = snap.custosEffective[key] ?? 0;
    }
    return ensureFinanceiroShape({ ivaPct: snap.ivaPct }, seed);
  } catch {
    return ensureFinanceiroShape(null);
  }
}

function mergeBySourceId<T extends { id: string; sourceId?: string }>(
  existing: T[],
  incoming: T[],
  _manual: boolean
): T[] {
  if (existing.length === 0) return incoming;
  const have = new Set(existing.map((e) => e.sourceId).filter(Boolean));
  const extras = incoming.filter((i) => i.sourceId && !have.has(i.sourceId));
  return [...existing, ...extras];
}

export async function seedOrMergeProjectReport(
  projectId: string,
  existing: ProjectReport | null
): Promise<ProjectReport> {
  const id = projectId.trim();
  const now = new Date().toISOString();
  const { state, name, ownerName, createdAt, updatedAt } = reviveProjectState(id);

  const seededCaixas = buildCaixas(state);
  const seededPecas = buildPecas(id);
  const seededMateriais = buildMateriais(state);
  const seededFinanceiro = buildFinanceiroFromState(state);
  const trak = await importTrakSnapshot(id);

  if (!existing) {
    const producao = {
      ...trakIntoEmptyProducao(trak),
      caixas: seededCaixas,
      pecas: seededPecas,
    };
    return {
      projectId: id,
      version: 1,
      reportStyle: "classic",
      createdAt: now,
      updatedAt: now,
      gerais: {
        ...emptyGerais(),
        nomeProjeto: name || state?.projectName || `Projeto ${id}`,
        designer: resolveProjectDesigner(state, ownerName),
        empresa: resolveEmpresaExecutora(state),
        materiaisDescricao: resolveMateriaisProjeto(state),
        dataInicioExecucao: toDateInput(createdAt),
        dataConclusaoExecucao: toDateInput(updatedAt),
      },
      metricas: trak.metricas,
      design: emptyDesign(),
      producao,
      montagem: trakIntoEmptyMontagem(trak),
      materiais: seededMateriais,
      financeiro: seededFinanceiro,
      manualPaths: [],
      history: [],
      notas: [],
      qualidade: emptyQualidade(),
    };
  }

  const gerais = { ...emptyGerais(), ...existing.gerais };
  if (!isManualPath(existing, "gerais.nomeProjeto") && name) gerais.nomeProjeto = name;
  if (!isManualPath(existing, "gerais.designer") && !gerais.designer) {
    gerais.designer = resolveProjectDesigner(state, ownerName);
  }
  if (!isManualPath(existing, "gerais.empresa") && !gerais.empresa) {
    gerais.empresa = resolveEmpresaExecutora(state);
  }
  if (!isManualPath(existing, "gerais.materiaisDescricao") && !gerais.materiaisDescricao) {
    gerais.materiaisDescricao = resolveMateriaisProjeto(state);
  }
  if (!isManualPath(existing, "gerais.dataInicioExecucao") && !gerais.dataInicioExecucao) {
    gerais.dataInicioExecucao = toDateInput(createdAt);
  }

  const applied = applyTrakToReportParts(
    {
      metricas: existing.metricas,
      producao: existing.producao,
      montagem: existing.montagem,
    },
    trak,
    (path) => isManualPath(existing, path)
  );

  const caixas = mergeBySourceId(
    applied.producao.caixas,
    seededCaixas,
    isManualPath(existing, "producao.caixas")
  );
  const pecas = mergeBySourceId(
    applied.producao.pecas,
    seededPecas,
    isManualPath(existing, "producao.pecas")
  );
  const materiais = mergeBySourceId(
    existing.materiais,
    seededMateriais,
    isManualPath(existing, "materiais")
  );

  let financeiro = existing.financeiro;
  if (!isManualPath(existing, "financeiro")) {
    const seedMap = new Map(seededFinanceiro.linhas.map((l) => [l.key, l]));
    financeiro = ensureFinanceiroShape({
      ivaPct: existing.financeiro.ivaPct,
      linhas: existing.financeiro.linhas.map((l) => {
        if (l.key === "iva" || l.key === "total") return l;
        if ((l.total ?? 0) > 0 || (l.detalhe?.length ?? 0) > 0) return l;
        return seedMap.get(l.key) ?? l;
      }),
    });
  }

  return {
    ...existing,
    gerais,
    metricas: applied.metricas,
    producao: {
      ...applied.producao,
      caixas,
      pecas,
    },
    montagem: applied.montagem,
    materiais,
    financeiro,
    history: existing.history ?? [],
    notas: existing.notas ?? [],
    qualidade: existing.qualidade ?? emptyQualidade(),
    updatedAt: now,
  };
}
