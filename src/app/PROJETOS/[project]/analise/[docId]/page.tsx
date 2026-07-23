import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { getCurrentProjectUser } from "@/core/projects/currentUser";
import {
  buildIndustrialOnlineAnalysisIndexPath,
  downloadIndustrialOnlineAnalysisPdfs,
  formatIndustrialAnalysisValidationErrors,
  getEffectiveRowsForDoc,
  isIndustrialOnlineAnalysisDocId,
  validateIndustrialOnlineAnalysisDraft,
} from "@/core/industrial/onlineAnalysis";
import { buildCanonicalIndustrialOnlineAnalysisSections } from "@/core/industrial/onlineAnalysis/buildIndustrialOnlineAnalysisView";
import { buildOverrideFromDraft } from "@/core/industrial/onlineAnalysis/applyIndustrialDocumentOverrides";
import { makeAddedRowId } from "@/core/industrial/onlineAnalysis/industrialOnlineAnalysisRowIds";
import type { IndustrialOnlineAnalysisTableSection } from "@/core/industrial/onlineAnalysis/industrialOnlineAnalysisViewTypes";
import type { IndustrialHistoryFocus } from "@/core/industrial/onlineAnalysis/industrialDocumentHistoryTypes";
import { mergeDocOverride } from "@/core/industrial/onlineAnalysis/persistIndustrialDocumentOverrides";
import { getDocumentaryOverrideDocId } from "@/core/industrial/onlineAnalysis/industrialDocumentarySsot";
import { resolveDocumentaryOverride } from "@/core/industrial/onlineAnalysis/industrialDocumentarySsot";
import { jumpToIndustrialHistoryCell } from "@/core/industrial/onlineAnalysis/jumpToIndustrialHistoryCell";
import { industrialFeatureFlags } from "@/industrial/config/featureFlags";

import IndustrialOnlineAnalysisLayout from "../../../analise/IndustrialOnlineAnalysisLayout";
import IndustrialOnlineAnalysisTable from "../../../analise/IndustrialOnlineAnalysisTable";
import IndustrialOnlineAnalysisHistoryPanel from "../../../analise/IndustrialOnlineAnalysisHistoryPanel";
import { useIndustrialAnalysisProject } from "../../../analise/useIndustrialAnalysisProject";

function cloneSections(
  sections: IndustrialOnlineAnalysisTableSection[]
): IndustrialOnlineAnalysisTableSection[] {
  return sections.map((s) => ({
    ...s,
    columns: s.columns.map((c) => ({ ...c })),
    rows: s.rows.map((r) => ({
      ...r,
      cells: { ...r.cells },
      modifiedFields: [...r.modifiedFields],
    })),
  }));
}

export default function ProjetosAnaliseDocPage() {
  const { project: pageSlug, docId } = useParams();
  const location = useLocation();
  const enabled = industrialFeatureFlags.industrialOnlineAnalysis;
  const validDoc = isIndustrialOnlineAnalysisDocId(docId);

  const { projectState, projectName, loading, error, commitOverrides } =
    useIndustrialAnalysisProject(pageSlug);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<IndustrialOnlineAnalysisTableSection[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfMsg, setPdfMsg] = useState<string | null>(null);

  const view = useMemo(() => {
    if (!validDoc || !projectState) return null;
    return getEffectiveRowsForDoc(projectState, docId);
  }, [validDoc, projectState, docId]);

  const canonicalSections = useMemo(() => {
    if (!validDoc || !projectState) return [];
    return buildCanonicalIndustrialOnlineAnalysisSections(projectState, docId);
  }, [validDoc, projectState, docId]);

  const displaySections = editing && draft ? draft : view?.sections ?? [];

  const historyEntries = projectState?.industrialDocumentHistory ?? [];

  useEffect(() => {
    if (loading || editing || !view) return;
    const jumpFocus = (location.state as { jumpFocus?: IndustrialHistoryFocus } | null)?.jumpFocus;
    if (!jumpFocus) return;
    const t = window.setTimeout(() => {
      jumpToIndustrialHistoryCell(jumpFocus);
    }, 120);
    return () => window.clearTimeout(t);
  }, [loading, editing, view, location.state]);

  const startEdit = () => {
    if (!view) return;
    setDraft(cloneSections(view.sections));
    setEditing(true);
    setSaveMsg(null);
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditing(false);
    setSaveMsg(null);
  };

  const onCellChange = useCallback((rowId: string, fieldKey: string, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return prev.map((section) => ({
        ...section,
        rows: section.rows.map((row) =>
          row.rowId === rowId
            ? {
                ...row,
                cells: { ...row.cells, [fieldKey]: value },
                modifiedFields: row.modifiedFields.includes(fieldKey)
                  ? row.modifiedFields
                  : [...row.modifiedFields, fieldKey],
              }
            : row
        ),
      }));
    });
  }, []);

  const onDeleteRow = useCallback((rowId: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return prev.map((section) => ({
        ...section,
        rows: section.rows
          .map((row) => {
            if (row.rowId !== rowId) return row;
            if (row.origin === "added" || rowId.startsWith("added:")) return null;
            return { ...row, pendingDelete: true };
          })
          .filter(Boolean) as typeof section.rows,
      }));
    });
  }, []);

  const onAddRow = useCallback((sectionId: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return prev.map((section) => {
        if (section.id !== sectionId) return section;
        const cells: Record<string, string> = {};
        for (const c of section.columns) cells[c.key] = "";
        return {
          ...section,
          modified: true,
          rows: [
            ...section.rows,
            {
              rowId: makeAddedRowId(),
              cells,
              origin: "added" as const,
              modifiedFields: section.columns.map((c) => c.key),
              pendingDelete: false,
            },
          ],
        };
      });
    });
  }, []);

  const generatePdf = async (rowsMode: "effective" | "canonical") => {
    if (!validDoc || !projectState) return;
    setGeneratingPdf(true);
    setPdfMsg(null);
    try {
      const result = await downloadIndustrialOnlineAnalysisPdfs(projectState, [docId], {
        rowsMode,
      });
      if (!result.ok && result.docCount === 0) {
        setPdfMsg(result.errors[0]?.message ?? "Falha ao gerar PDF.");
      } else {
        setPdfMsg(
          rowsMode === "canonical"
            ? `PDF original descarregado: ${result.fileName}`
            : `PDF descarregado: ${result.fileName}`
        );
      }
    } catch (err) {
      setPdfMsg(err instanceof Error ? err.message : "Falha ao gerar PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const saveEdit = async () => {
    if (!validDoc || !projectState || !draft) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const validation = validateIndustrialOnlineAnalysisDraft(docId, draft);
      if (!validation.ok) {
        setSaveMsg(formatIndustrialAnalysisValidationErrors(validation.errors));
        return;
      }

      const user = getCurrentProjectUser();
      const storeKey = getDocumentaryOverrideDocId(docId);
      const previousOverride = resolveDocumentaryOverride(
        projectState.industrialDocumentOverrides,
        docId
      );
      const override = buildOverrideFromDraft({
        docId: storeKey,
        canonicalSections,
        draftSections: draft,
        actor: { userId: user.ownerId, userName: user.ownerName },
        previous: previousOverride,
      });
      const nextOverrides = mergeDocOverride(
        projectState.industrialDocumentOverrides,
        docId,
        override
      );

      await commitOverrides(nextOverrides, {
        historyDocId: storeKey,
        previousOverride,
      });
      setEditing(false);
      setDraft(null);
      setSaveMsg("Alterações guardadas.");
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Falha ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (!enabled) {
    return (
      <IndustrialOnlineAnalysisLayout
        projectName={projectName}
        pageSlug={pageSlug ?? projectName}
        docLabel={validDoc ? docId : undefined}
      >
        <p style={{ color: "#64748b", fontSize: 14 }}>
          A funcionalidade «Análise arquivo completo» está desativada (
          <code>industrialOnlineAnalysis = false</code>).
        </p>
      </IndustrialOnlineAnalysisLayout>
    );
  }

  if (!validDoc) {
    return (
      <IndustrialOnlineAnalysisLayout projectName={projectName} pageSlug={pageSlug ?? projectName}>
        <p style={{ color: "#dc2626" }}>Documento industrial desconhecido: {docId}</p>
        <Link to={buildIndustrialOnlineAnalysisIndexPath(projectName)} style={{ color: "#2563eb" }}>
          Voltar ao índice
        </Link>
      </IndustrialOnlineAnalysisLayout>
    );
  }

  return (
    <IndustrialOnlineAnalysisLayout
      projectName={projectName}
      pageSlug={pageSlug ?? projectName}
      docLabel={view?.label ?? docId}
    >
      {loading ? <p style={{ color: "#64748b" }}>A carregar projeto…</p> : null}
      {!loading && error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}
      {!loading && !error && !view ? (
        <p style={{ color: "#dc2626" }}>Não foi possível construir a vista deste documento.</p>
      ) : null}
      {!loading && !error && view ? (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: "#64748b", flex: 1 }}>
              {view.description} — projeto <strong>{view.projectName}</strong>
              {editing ? " — modo edição (draft local)" : ""}
            </p>
            {!editing ? (
              <>
                <button
                  type="button"
                  disabled={generatingPdf}
                  onClick={() => void generatePdf("effective")}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: "#1d4ed8",
                    color: "#fff",
                    cursor: generatingPdf ? "wait" : "pointer",
                    fontSize: 13,
                  }}
                >
                  {generatingPdf ? "A gerar…" : "Gerar PDF"}
                </button>
                <button
                  type="button"
                  disabled={generatingPdf}
                  onClick={() => void generatePdf("canonical")}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    cursor: generatingPdf ? "wait" : "pointer",
                    fontSize: 13,
                  }}
                >
                  Gerar PDF original
                </button>
                <button
                  type="button"
                  onClick={startEdit}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: "#0f172a",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Editar
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveEdit()}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: "#15803d",
                    color: "#fff",
                    cursor: saving ? "wait" : "pointer",
                    fontSize: 13,
                  }}
                >
                  {saving ? "A guardar…" : "Guardar"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={cancelEdit}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
          {saveMsg ? (
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 13,
                color: saveMsg.startsWith("Guardar bloqueado") ? "#b91c1c" : "#15803d",
              }}
              role={saveMsg.startsWith("Guardar bloqueado") ? "alert" : "status"}
            >
              {saveMsg}
            </p>
          ) : null}
          {pdfMsg ? (
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#1d4ed8" }}>{pdfMsg}</p>
          ) : null}
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b" }}>
            Overrides documentais: design 3D e CNC/TCN/drill não são alterados. A cutlist editada
            alimenta as etiquetas UEE (whitelist). Remover linha omite só a etiqueta. Downloads não
            registam histórico. Quantidade e material inválidos bloqueiam o Guardar.
          </p>
          {displaySections.map((section) => (
            <IndustrialOnlineAnalysisTable
              key={section.id}
              title={section.title}
              modified={section.modified}
              columns={section.columns}
              rows={section.rows}
              editing={editing}
              onCellChange={onCellChange}
              onDeleteRow={onDeleteRow}
              onAddRow={() => onAddRow(section.id)}
            />
          ))}
          {!editing && validDoc ? (
            <IndustrialOnlineAnalysisHistoryPanel
              entries={historyEntries}
              projectName={projectName}
              lockedDocId={docId}
              title="Histórico deste documento"
            />
          ) : null}
          <Link
            to={buildIndustrialOnlineAnalysisIndexPath(projectName)}
            style={{ fontSize: 13, color: "#2563eb" }}
          >
            Voltar ao índice de análise
          </Link>
        </>
      ) : null}
    </IndustrialOnlineAnalysisLayout>
  );
}
