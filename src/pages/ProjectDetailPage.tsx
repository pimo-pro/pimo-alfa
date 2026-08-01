import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { generateProjectWorkOrders } from "@/industrial/api/workOrderActions";
import { resolveProjectCutlist } from "@/industrial/work-orders/resolveProjectCutlist";
import Card from "../components/ui/Card";
import Loader from "../components/ui/Loader";
import PageContainer from "../components/ui/PageContainer";
import PageHeader from "../components/ui/PageHeader";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [pieceCount, setPieceCount] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!id) {
        setLoading(false);
        return;
      }
      const context = resolveProjectCutlist(id);
      setProjectName(context?.projectName ?? null);
      setPieceCount(context?.pieces.length ?? 0);
      setLoading(false);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [id]);

  const handleGenerateWorkOrders = useCallback(async () => {
    if (!id) return;
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const result = await generateProjectWorkOrders(id);
      setMessage(`Criadas ${result.orders.length} ordens de trabalho para "${result.projectName}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar ordens.");
    } finally {
      setGenerating(false);
    }
  }, [id]);

  return (
    <PageContainer>
      <Card>
        <PageHeader title={projectName ? projectName : `Projeto ${id}`} />
        {loading ? <Loader label={`Carregando projeto ${id}...`} /> : null}
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
                to={`/industrial/work-orders${id ? `?project=${id}` : ""}`}
                style={{ alignSelf: "center", color: "#2563eb" }}
              >
                Ver work orders
              </Link>
              {id ? (
                <Link
                  to={`/relatorio-final/${id}`}
                  style={{ alignSelf: "center", color: "#2563eb" }}
                >
                  Relatório Final
                </Link>
              ) : null}
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
