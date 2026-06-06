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
import "../components/ui/ui.css";
import { convertProjectToV3Pieces } from "../nesting-v3/utils/convertProjectToV3Pieces";

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

  const openSelectedInNestingV3 = useCallback(() => {
    const selectedId = mergeSelectedIds[0] ?? loadedIds[0];
    if (!selectedId) return;
    const index = ids.indexOf(selectedId);
    const entry = entries[index];
    if (!entry?.projectState) return;
    const pieces = convertProjectToV3Pieces(entry.projectState).map((piece) => ({
      ...piece,
      sourceProjectId: selectedId,
    }));
    navigate("/nesting_v3", {
      state: {
        openNestingV3: true,
        pieces,
        projectId: selectedId,
        projectName: entry.recordName ?? entry.projectState.projectName,
      },
    });
  }, [entries, ids, loadedIds, mergeSelectedIds, navigate]);

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
          subtitle={`Visualização múltipla (snapshots) — Espaçamento da grelha: ${SHOWROOM_SPACING_MM} mm — Máx. ${MAX_SHOWROOM_IDS} projetos`}
        />

        {/* Barra de ações */}
        <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
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
          <Button
            type="button"
            variant="outline"
            disabled={loading || loadedIds.length === 0}
            onClick={openSelectedInNestingV3}
          >
            Abrir no Nesting V3
          </Button>
        </div>

        {/* Estado vazio */}
        {ids.length === 0 ? (
          <div style={{ padding: "12px 0" }}>
            <p className="ui-text-muted">
              Nenhum projeto selecionado. Utilize a query{" "}
              <code style={{ fontSize: 12 }}>?ids=id1,id2</code> ou grave uma lista JSON em{" "}
              <code style={{ fontSize: 12 }}>sessionStorage[&quot;{PIMO_SHOWROOM_PROJECT_IDS_KEY}&quot;]</code>{" "}
              (array de strings ou objeto <code style={{ fontSize: 12 }}>{`{ ids: string[] }`}</code>).
            </p>
          </div>
        ) : null}

        {/* Erros de carregamento */}
        {errorRows.length > 0 ? (
          <div
            style={{
              marginBottom: 8,
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid var(--text-danger, #b00020)",
              background: "rgba(176,0,32,0.04)",
            }}
          >
            <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "var(--text-danger, #b00020)" }}>
              Erros por projeto ({errorRows.length})
            </p>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--text-danger, #b00020)" }}>
              {errorRows.map((row) => (
                <li key={row.id}>
                  <code>{row.id}</code>: {row.error}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Loader */}
        {loading && ids.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <Card>
              <Loader label="A carregar snapshots…" />
            </Card>
          </div>
        ) : null}

        {/* Canvas + painel lateral */}
        {!loading && ids.length > 0 ? (
          <div style={{ marginTop: 4 }}>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ui-color-muted, #71717a)",
                letterSpacing: "0.02em",
              }}
            >
              Snapshots carregados ({loadedIds.length})
            </p>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                width: "100%",
              }}
            >
              {/* Canvas ocupa 85% da largura */}
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
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
              {/* Painel lateral estreito */}
              <ShowroomVisibilityPanel rows={visibilityRows} allIds={ids} />
            </div>
          </div>
        ) : null}
      </Card>
    </PageContainer>
  );
}
