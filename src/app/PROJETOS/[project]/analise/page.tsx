import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { reviveState } from "@/context/projectPersistence";
import { applyResultados } from "@/context/projectState";
import type { ProjectState } from "@/context/projectTypes";
import type { SavedProjectRecord } from "@/core/projects/types";
import type { IndustrialHistoryEntry } from "@/core/industrial/onlineAnalysis/industrialDocumentHistoryTypes";
import type { IndustrialOnlineAnalysisDocId } from "@/core/industrial/onlineAnalysis/industrialOnlineAnalysisDocs";
import {
  INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS,
  INDUSTRIAL_ONLINE_ANALYSIS_DOCS,
  anyDocumentHasOverrides,
  buildIndustrialOnlineAnalysisDocPath,
  documentHasOverrides,
  downloadIndustrialOnlineAnalysisPdfs,
  listModifiedIndustrialDocIds,
} from "@/core/industrial/onlineAnalysis";
import { industrialFeatureFlags } from "@/industrial/config/featureFlags";

import IndustrialOnlineAnalysisLayout from "../../analise/IndustrialOnlineAnalysisLayout";
import IndustrialOnlineAnalysisHistoryPanel from "../../analise/IndustrialOnlineAnalysisHistoryPanel";
import IndustrialOnlineAnalysisDownloadBar from "../../analise/IndustrialOnlineAnalysisDownloadBar";
import {
  getProjetosSnapshot,
  setProjetosSnapshot,
} from "../../projetosSnapshotCache";
import { loadProjectRecordByPageSlug } from "../../projetosProjectLoader";
import {
  decodeProjetosPageSlug,
  snapshotMatchesProjetosPageSlug,
} from "../../projetosPageSlug";

export default function ProjetosAnaliseIndexPage() {
  const { project: pageSlug } = useParams();
  const enabled = industrialFeatureFlags.industrialOnlineAnalysis;

  const [snapshot, setSnapshot] = useState<SavedProjectRecord | null>(() => {
    const cached = getProjetosSnapshot();
    return snapshotMatchesProjetosPageSlug(cached, pageSlug) ? cached : null;
  });
  const [loading, setLoading] = useState(
    () => !snapshotMatchesProjetosPageSlug(getProjetosSnapshot(), pageSlug)
  );
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<IndustrialOnlineAnalysisDocId>>(new Set());
  const [busy, setBusy] = useState(false);
  const [dlMsg, setDlMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!pageSlug) {
      setError("Projeto n�o especificado na URL.");
      setLoading(false);
      return;
    }

    const cached = getProjetosSnapshot();
    if (snapshotMatchesProjetosPageSlug(cached, pageSlug)) {
      setSnapshot(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadProjectRecordByPageSlug(pageSlug).then((record) => {
      if (cancelled) return;
      if (!record) {
        setSnapshot(null);
        setLoading(false);
        setError("Projeto n�o encontrado.");
        return;
      }
      setProjetosSnapshot(record);
      setSnapshot(record);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [pageSlug]);

  const projectName = useMemo(() => {
    if (snapshot?.name?.trim()) return snapshot.name.trim();
    return decodeProjetosPageSlug(pageSlug ?? "Projeto");
  }, [snapshot, pageSlug]);

  const projectState: ProjectState | null = useMemo(() => {
    if (!snapshot?.snapshot?.projectState) return null;
    const revived = reviveState(snapshot.snapshot.projectState);
    if (!revived) return null;
    return applyResultados(revived);
  }, [snapshot]);

  const revivedOk = projectState != null;
  const historyEntries: IndustrialHistoryEntry[] =
    projectState?.industrialDocumentHistory ?? [];
  const hasAnyOverrides = anyDocumentHasOverrides(projectState?.industrialDocumentOverrides);
  const modifiedIds = useMemo(
    () => (projectState ? listModifiedIndustrialDocIds(projectState) : []),
    [projectState]
  );

  const toggleDoc = useCallback((docId: IndustrialOnlineAnalysisDocId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }, []);

  const runDownload = useCallback(
    async (
      docIds: IndustrialOnlineAnalysisDocId[],
      rowsMode: "effective" | "canonical",
      emptyMessage: string
    ) => {
      if (!projectState) return;
      if (docIds.length === 0) {
        setDlMsg(emptyMessage);
        return;
      }
      setBusy(true);
      setDlMsg(null);
      try {
        const result = await downloadIndustrialOnlineAnalysisPdfs(projectState, docIds, {
          rowsMode,
        });
        if (!result.ok && result.docCount === 0) {
          setDlMsg(result.errors[0]?.message ?? "Falha ao gerar PDFs.");
        } else if (result.errors.length) {
          setDlMsg(
            `Descarregado ${result.fileName} (${result.docCount} PDF(s)); falhas: ${result.errors
              .map((e) => e.docId)
              .join(", ")}`
          );
        } else {
          setDlMsg(`Descarregado: ${result.fileName}`);
        }
      } catch (err) {
        setDlMsg(err instanceof Error ? err.message : "Falha no download.");
      } finally {
        setBusy(false);
      }
    },
    [projectState]
  );

  if (!enabled) {
    return (
      <IndustrialOnlineAnalysisLayout
        projectName={projectName}
        pageSlug={pageSlug ?? projectName}
      >
        <p style={{ color: "#64748b", fontSize: 14 }}>
          A funcionalidade �An�lise arquivo completo� est� desativada (
          <code>industrialOnlineAnalysis = false</code>).
        </p>
      </IndustrialOnlineAnalysisLayout>
    );
  }

  return (
    <IndustrialOnlineAnalysisLayout projectName={projectName} pageSlug={pageSlug ?? projectName}>
      {loading ? <p style={{ color: "#64748b" }}>A carregar projeto�</p> : null}
      {!loading && error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}
      {!loading && !error && !revivedOk ? (
        <p style={{ color: "#dc2626" }}>N�o foi poss�vel ler o estado do projeto.</p>
      ) : null}
      {!loading && !error && revivedOk && projectState ? (
        <>
          <IndustrialOnlineAnalysisDownloadBar
            selectedCount={selected.size}
            modifiedCount={modifiedIds.length}
            hasAnyOverrides={hasAnyOverrides}
            busy={busy}
            message={dlMsg}
            onSelectAll={() => setSelected(new Set(INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS))}
            onClearSelection={() => setSelected(new Set())}
            onGenerateSelected={() =>
              void runDownload([...selected], "effective", "Seleccione pelo menos um documento.")
            }
            onGenerateModified={() =>
              void runDownload(modifiedIds, "effective", "Nenhum PDF modificado.")
            }
            onGenerateAll={() =>
              void runDownload([...INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS], "effective", "")
            }
            onGenerateOriginals={() => {
              const ids =
                selected.size > 0
                  ? [...selected]
                  : [...INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS];
              void runDownload(ids, "canonical", "");
            }}
          />
          <div style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748b" }}>
              Documentos industriais (leitura + edi��o documental + download seletivo). A cutlist
              editada alimenta as etiquetas UEE (material/obs/qtd/pe�a/caixa) sem alterar CNC.
            </p>
            {documentHasOverrides(projectState.industrialDocumentOverrides, "cutlist") ? (
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 12,
                  color: "#92400e",
                  background: "#fffbeb",
                  padding: "8px 10px",
                  borderRadius: 6,
                }}
              >
                A cutlist tem edi��es documentais: as etiquetas UEE reflectem material, qtd,
                observa��es, pe�a e caixa. CNC/TCN/drill/nesting n�o s�o alterados.
              </p>
            ) : null}
            {INDUSTRIAL_ONLINE_ANALYSIS_DOCS.map((doc) => {
              const modified = documentHasOverrides(
                projectState.industrialDocumentOverrides,
                doc.id
              );
              const isSelected = selected.has(doc.id);
              return (
                <div
                  key={doc.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "stretch",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${isSelected ? "#93c5fd" : "#e2e8f0"}`,
                    background: isSelected ? "#eff6ff" : "#fff",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDoc(doc.id)}
                      disabled={busy}
                    />
                    <span style={{ fontSize: 12, color: "#64748b" }}>Sel.</span>
                  </label>
                  <Link
                    to={buildIndustrialOnlineAnalysisDocPath(projectName, doc.id)}
                    style={{
                      flex: 1,
                      textDecoration: "none",
                      color: "#0f172a",
                      minWidth: 0,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
                      <span>{doc.label}</span>
                      {modified ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 999,
                            background: "#fef3c7",
                            color: "#92400e",
                          }}
                        >
                          Modificado
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      {doc.description} � <code style={{ fontSize: 11 }}>{doc.id}</code>
                    </div>
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runDownload([doc.id], "effective", "")}
                    style={{
                      alignSelf: "center",
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#fff",
                      cursor: busy ? "wait" : "pointer",
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    PDF
                  </button>
                </div>
              );
            })}
          </div>
          <IndustrialOnlineAnalysisHistoryPanel
            entries={historyEntries}
            projectName={projectName}
            title="Hist�rico global"
          />
        </>
      ) : null}
    </IndustrialOnlineAnalysisLayout>
  );
}
