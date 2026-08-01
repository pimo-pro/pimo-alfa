import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import { generateProjectWorkOrders } from "@/industrial/api/workOrderActions";
import {
  buildRelatorioFinalPath,
  buildWorkOrdersListPath,
  isInternalProjectId,
  resolveProjectIdentity,
} from "@/core/projects/projectIdentity";
import { resolveProjectCutlist } from "@/industrial/work-orders/resolveProjectCutlist";
import Card from "../components/ui/Card";
import Loader from "../components/ui/Loader";
import PageContainer from "../components/ui/PageContainer";
import PageHeader from "../components/ui/PageHeader";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const identity = useMemo(() => resolveProjectIdentity(id), [id]);
  const persistenceId = identity?.persistenceId || id || "";
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(identity?.name ?? null);
  const [pieceCount, setPieceCount] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!id) {
        setLoading(false);
        return;
      }
      const context = resolveProjectCutlist(id);
      setProjectName(context?.projectName ?? identity?.name ?? null);
      setPieceCount(context?.pieces.length ?? 0);
      setLoading(false);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [id, identity?.name]);

  const handleGenerateWorkOrders = useCallback(async () => {
    if (!persistenceId) return;
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const result = await generateProjectWorkOrders(persistenceId);
      setMessage(`Criadas ${result.orders.length} ordens de trabalho para "${result.projectName}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar ordens.");
    } finally {
      setGenerating(false);
    }
  }, [persistenceId]);

  if (id && isInternalProjectId(id) && identity?.slug) {
    return <Navigate to={`/projects/${encodeURIComponent(identity.slug)}`} replace />;
  }

  const displayName = projectName || identity?.name || "Projeto";

  return (
    <PageContainer>
      <Card>
        <PageHeader title={displayName} />
        {loading ? <Loader label={`Carregando projeto ${displayName}...`} /> : null}
        {!loading ? (
          <div style={{ display: "grid", gap: 16 }}>
            <p>Placeholder da FASE 4 (editor não implementado).</p>
            <p style={{ margin: 0, color: "#64748b" }}>
              Peças na cutlist: <strong>{pieceCount}</strong>
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={generating || pieceCount === 0}
                onClick={() => void handleGenerateWorkOrders()}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "none",
                  background: "#0f172a",
                  color: "#fff",
                  cursor: generating ? "wait" : "pointer",
                }}
              >
                {generating ? "A gerar ordens…" : "Gerar Ordens de Trabalho Industriais"}
              </button>
              <Link
                to={buildWorkOrdersListPath(identity?.slug || displayName)}
                style={{ alignSelf: "center", color: "#2563eb" }}
              >
                Ver work orders
              </Link>
              <Link
                to={buildRelatorioFinalPath(identity?.slug || displayName)}
                style={{ alignSelf: "center", color: "#2563eb" }}
              >
                Relatório Final
              </Link>
            </div>
            {message ? <p style={{ margin: 0, color: "#16a34a" }}>{message}</p> : null}
            {error ? <p style={{ margin: 0, color: "#dc2626" }}>{error}</p> : null}
            {pieceCount === 0 ? (
              <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
                Sem peças na cutlist — adicione painéis no projeto antes de gerar ordens.
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>
    </PageContainer>
  );
}
