import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import type { IndustrialHistoryEntry } from "@/core/industrial/onlineAnalysis/industrialDocumentHistoryTypes";
import type { IndustrialOnlineAnalysisDocId } from "@/core/industrial/onlineAnalysis/industrialOnlineAnalysisDocs";
import { INDUSTRIAL_ONLINE_ANALYSIS_DOCS } from "@/core/industrial/onlineAnalysis/industrialOnlineAnalysisDocs";
import { buildIndustrialOnlineAnalysisDocPath } from "@/core/industrial/onlineAnalysis/industrialOnlineAnalysisPaths";
import { jumpToIndustrialHistoryCell } from "@/core/industrial/onlineAnalysis/jumpToIndustrialHistoryCell";
import { isCutlistSsotDocId } from "@/core/industrial/onlineAnalysis/industrialDocumentarySsot";

type Props = {
  entries: IndustrialHistoryEntry[];
  projectName: string;
  lockedDocId?: IndustrialOnlineAnalysisDocId;
  title?: string;
};

const panel: CSSProperties = {
  marginTop: 24,
  padding: 14,
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#fff",
};

const TYPE_LABEL: Record<string, string> = {
  add: "Adiùùo",
  remove: "Remoùùo",
  modify: "Modificaùùo",
};

function formatTs(ts: string): string {
  try {
    return new Date(ts).toLocaleString("pt-PT");
  } catch {
    return ts;
  }
}

function truncate(v: string | null, max = 48): string {
  if (v == null) return "ù";
  if (v.length <= max) return v;
  return `${v.slice(0, max)}ù`;
}

export default function IndustrialOnlineAnalysisHistoryPanel({
  entries,
  projectName,
  lockedDocId,
  title = "Histùrico",
}: Props) {
  const navigate = useNavigate();
  const [docFilter, setDocFilter] = useState<string>(lockedDocId ?? "");
  const [userFilter, setUserFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const users = useMemo(() => {
    const set = new Set(entries.map((e) => e.userName).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "pt"));
  }, [entries]);

  const filtered = useMemo(() => {
    const list = entries.filter((e) => {
      if (lockedDocId) {
        if (isCutlistSsotDocId(lockedDocId)) {
          if (!isCutlistSsotDocId(e.docId as IndustrialOnlineAnalysisDocId)) return false;
        } else if (e.docId !== lockedDocId) {
          return false;
        }
      }
      if (!lockedDocId && docFilter && e.docId !== docFilter) return false;
      if (userFilter && e.userName !== userFilter) return false;
      if (typeFilter && e.changeType !== typeFilter) return false;
      return true;
    });
    return [...list].sort((a, b) => b.ts.localeCompare(a.ts));
  }, [entries, lockedDocId, docFilter, userFilter, typeFilter]);

  const onClickEntry = async (entry: IndustrialHistoryEntry) => {
    setMessage(null);
    const targetPath = buildIndustrialOnlineAnalysisDocPath(projectName, entry.docId);
    const onDocPage =
      typeof window !== "undefined" &&
      window.location.pathname.includes(`/analise/${entry.docId}`);

    if (!onDocPage) {
      navigate(targetPath, { state: { jumpFocus: entry.focus } });
      return;
    }

    requestAnimationFrame(() => {
      const result = jumpToIndustrialHistoryCell(entry.focus);
      if (!result.ok) {
        setMessage("Campo nùo encontrado (linha removida ou documento alterado).");
      }
    });
  };

  return (
    <section style={panel} aria-label={title}>
      <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
        {title}
        <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: "#64748b" }}>
          ({filtered.length})
        </span>
      </h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {!lockedDocId ? (
          <label style={{ fontSize: 12, color: "#64748b" }}>
            Documento{" "}
            <select
              value={docFilter}
              aria-label="Filtrar por documento"
              onChange={(e) => setDocFilter(e.target.value)}
              style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
            >
              <option value="">Todos os documentos</option>
              {INDUSTRIAL_ONLINE_ANALYSIS_DOCS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label style={{ fontSize: 12, color: "#64748b" }}>
          Utilizador{" "}
          <select
            value={userFilter}
            aria-label="Filtrar por utilizador"
            onChange={(e) => setUserFilter(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
          >
            <option value="">Todos os utilizadores</option>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 12, color: "#64748b" }}>
          Tipo{" "}
          <select
            value={typeFilter}
            aria-label="Filtrar por tipo"
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
          >
            <option value="">Todos os tipos</option>
            <option value="modify">Modificaùùo</option>
            <option value="add">Adiùùo</option>
            <option value="remove">Remoùùo</option>
          </select>
        </label>
      </div>

      {message ? (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#b45309" }} role="alert" aria-live="polite">
          {message}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }} role="status">
          Sem entradas de histùrico.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
          {filtered.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => void onClickEntry(entry)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#0f172a",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: "#64748b" }}>{formatTs(entry.ts)}</span>
                  <span style={{ fontWeight: 600 }}>{entry.userName}</span>
                  {!lockedDocId ? (
                    <code style={{ fontSize: 11 }}>{entry.docId}</code>
                  ) : null}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 999,
                      background: "#e2e8f0",
                    }}
                  >
                    {TYPE_LABEL[entry.changeType] ?? entry.changeType}
                  </span>
                </div>
                <div style={{ color: "#334155" }}>
                  <code>{entry.fieldKey}</code>: {truncate(entry.oldValue)} ?{" "}
                  {truncate(entry.newValue)}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
