import { useCallback, useLayoutEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { ShowroomCanvas } from "../components/showroom/ShowroomCanvas";
import { ShowroomProjectRoot } from "../components/showroom/ShowroomProjectRoot";
import { ShowroomToolbar } from "../components/showroom/ShowroomToolbar";
import {
  ShowroomVisibilityPanel,
  type ShowroomVisibilityRow,
} from "../components/showroom/ShowroomVisibilityPanel";
import { useShowroomStore } from "../components/showroom/showroomStore";
import {
  computeShowroomGridOffsets,
  SHOWROOM_SPACING_MM,
} from "../components/showroom/showroomLayout";
import { useShowroomLoader } from "../components/showroom/useShowroomLoader";
import { ShowroomGenerateMultiFabricationButton } from "../components/showroom/ShowroomGenerateMultiFabricationButton";
import { PIMO_PENDING_WORKSPACE_MERGE_IDS } from "../core/projects/projectMergeWorkspace";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Loader from "../components/ui/Loader";
import PageContainer from "../components/ui/PageContainer";
import PageHeader from "../components/ui/PageHeader";
import Section from "../components/ui/Section";
import "../components/ui/ui.css";

/** Alinhado ao blueprint: lista de IDs escolhida em `/projects` (fase seguinte pode gravar aqui). */
export const PIMO_SHOWROOM_PROJECT_IDS_KEY = "pimo_showroom_project_ids";

const MAX_SHOWROOM_IDS = 24;

function parseIdsFromQuery(searchParams: URLSearchParams): string[] {
  const raw = searchParams.get("ids");
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseIdsFromSessionStorage(): string[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(PIMO_SHOWROOM_PROJECT_IDS_KEY);
    if (!raw?.trim()) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (parsed && typeof parsed === "object" && parsed !== null && "ids" in parsed) {
      const ids = (parsed as { ids: unknown }).ids;
      if (Array.isArray(ids)) {
        return ids
          .filter((item): item is string => typeof item === "string")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

function dedupeIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

/**
 * Query `?ids=` tem prioridade sobre sessionStorage (blueprint).
 */
function resolveShowroomIds(searchParams: URLSearchParams): string[] {
  const fromQuery = parseIdsFromQuery(searchParams);
  const fromSession = parseIdsFromSessionStorage();
  const source = fromQuery.length > 0 ? fromQuery : fromSession;
  return dedupeIds(source).slice(0, MAX_SHOWROOM_IDS);
}

export default function ProjectsViewerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ids = useMemo(() => resolveShowroomIds(searchParams), [searchParams]);
  const mergeIncludeById = useShowroomStore((s) => s.mergeIncludeById);

  const { entries, loading } = useShowroomLoader(ids);
  const offsets = useMemo(
    () => computeShowroomGridOffsets(ids.length, SHOWROOM_SPACING_MM),
    [ids.length]
  );

  const errorRows = useMemo(() => entries.filter((e) => e.error !== null), [entries]);

  const loadedIds = useMemo(
    () => ids.filter((_id, i) => Boolean(entries[i]?.projectState)),
    [ids, entries]
  );

  const mergeSelectedIds = useMemo(() => {
    return loadedIds.filter((id) => mergeIncludeById[id] !== false);
  }, [loadedIds, mergeIncludeById]);

  const sendSelectedToWorkspaceMerge = useCallback(() => {
    if (mergeSelectedIds.length === 0) return;
    try {
      sessionStorage.setItem(PIMO_PENDING_WORKSPACE_MERGE_IDS, JSON.stringify({ ids: mergeSelectedIds }));
    } catch {
      /* ignore */
    }
    navigate("/");
  }, [mergeSelectedIds, navigate]);

  const visibilityRows = useMemo((): ShowroomVisibilityRow[] => {
    return ids.flatMap((id, i) => {
      const e = entries[i];
      if (!e?.projectState) return [];
      const name = e.recordName?.trim() || e.projectState.projectName?.trim() || id;
      const label = name.length > 48 ? `${name.slice(0, 45)}…` : name;
      return [{ id, label }];
    });
  }, [ids, entries]);

  const loadedIdsKey = loadedIds.join("\u0001");

  useLayoutEffect(() => {
    if (loading) {
      useShowroomStore.getState().initProjectIds([]);
      return;
    }
    useShowroomStore.getState().initProjectIds(loadedIds);
  }, [loading, loadedIdsKey, loadedIds]);

  return (
    <PageContainer>
      <Card className="ui-projects-shell">
        <PageHeader
          title="Showroom de projetos"
          subtitle={`Visualização múltipla (snapshots). Espaçamento da grelha: ${SHOWROOM_SPACING_MM} mm. Máx. ${MAX_SHOWROOM_IDS} projetos.`}
        />

        <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <Link to="/projects">
            <Button type="button" variant="outline">
              Voltar a Projects
            </Button>
          </Link>
          <Button
            type="button"
            variant="primary"
            disabled={loading || mergeSelectedIds.length === 0}
            onClick={sendSelectedToWorkspaceMerge}
            title={
              mergeSelectedIds.length === 0
                ? "Marque pelo menos um projeto carregado para incluir no merge (painel lateral)."
                : undefined
            }
          >
            Enviar selecionados para Workspace (Merge)
          </Button>
          <ShowroomGenerateMultiFabricationButton showroomLoading={loading} />
        </div>

        {ids.length === 0 ? (
          <Section title="IDs">
            <p className="ui-text-muted">
              Nenhum projeto selecionado. Utilize a query{" "}
              <code style={{ fontSize: 12 }}>?ids=id1,id2</code> ou grave uma lista JSON em{" "}
              <code style={{ fontSize: 12 }}>sessionStorage[&quot;{PIMO_SHOWROOM_PROJECT_IDS_KEY}&quot;]</code>{" "}
              (array de strings ou objeto <code style={{ fontSize: 12 }}>{`{ ids: string[] }`}</code>).
            </p>
          </Section>
        ) : null}

        {ids.length > 0 ? (
          <Section title={`IDs carregados (${ids.length})`}>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
              {ids.map((id) => (
                <li key={id}>
                  <code>{id}</code>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {errorRows.length > 0 ? (
          <Section title="Erros por projeto">
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--text-danger, #b00020)" }}>
              {errorRows.map((row) => (
                <li key={row.id}>
                  <code>{row.id}</code>: {row.error}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {loading && ids.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <Card>
              <Loader label="A carregar snapshots…" />
            </Card>
          </div>
        ) : null}

        {!loading && ids.length > 0 ? (
          <Section title="Canvas">
            <p className="ui-text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Mover: arraste no plano XZ com projeto já selecionado; setas para ajuste fino. Rodar: Shift + arrastar.
              Régua: dois cliques no chão. Clique fora para desselecionar.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: "1 1 400px", minWidth: 280 }}>
                <ShowroomToolbar />
                <ShowroomCanvas>
                  {ids.map((id, i) => {
                    const entry = entries[i];
                    const offset = offsets[i];
                    if (!entry?.projectState || !offset) return null;
                    return (
                      <ShowroomProjectRoot
                        key={id}
                        projectId={id}
                        projectState={entry.projectState}
                        offsetMm={offset}
                        displayName={entry.recordName}
                      />
                    );
                  })}
                </ShowroomCanvas>
              </div>
              <ShowroomVisibilityPanel rows={visibilityRows} />
            </div>
          </Section>
        ) : null}
      </Card>
    </PageContainer>
  );
}
