import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import { PIMO_PENDING_SINGLE_LOAD } from "../../workspace/pendingSingleLoadUtils";
import { useShowroomStore } from "./showroomStore";

export type ShowroomVisibilityRow = {
  id: string;
  label: string;
};

type Props = {
  rows: ShowroomVisibilityRow[];
  /** Todos os IDs pedidos (incluindo os que falharam). Mostra secção de IDs no painel. */
  allIds?: string[];
};

function PanelDivider() {
  return (
    <div
      aria-hidden
      style={{ height: 1, background: "var(--border, #e4e4e7)", margin: "8px 0" }}
    />
  );
}

/**
 * Lista lateral: visibilidade por projeto (estado local do showroom).
 */
export function ShowroomVisibilityPanel({ rows, allIds }: Props) {
  const navigate = useNavigate();
  const entities = useShowroomStore((s) => s.entities);
  const mergeIncludeById = useShowroomStore((s) => s.mergeIncludeById);
  const toggleProjectVisible = useShowroomStore((s) => s.toggleProjectVisible);
  const toggleMergeInclude = useShowroomStore((s) => s.toggleMergeInclude);
  const selectedId = useShowroomStore((s) => s.selectedId);
  const setSelectedId = useShowroomStore((s) => s.setSelectedId);

  if (rows.length === 0) return null;

  return (
    <aside
      style={{
        flex: "0 0 190px",
        minWidth: 170,
        maxWidth: 210,
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid var(--border, #e4e4e7)",
        background: "var(--ui-color-surface, #fafafa)",
        alignSelf: "stretch",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        fontSize: 12,
      }}
    >
      {/* Cabeçalho */}
      <p
        style={{
          margin: "0 0 6px",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--ui-color-muted, #71717a)",
        }}
      >
        Visibilidade
      </p>

      {/* Linhas de projetos */}
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flex: 1,
          overflowY: "auto",
        }}
      >
        {rows.map((row, idx) => {
          const vis = entities[row.id]?.visible ?? true;
          const mergeOn = mergeIncludeById[row.id] !== false;
          const isSelected = selectedId === row.id;
          return (
            <li key={row.id}>
              {idx > 0 ? <PanelDivider /> : null}
              {/* Visibilidade + nome */}
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  cursor: "pointer",
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected
                    ? "var(--ui-color-primary, #2563eb)"
                    : "var(--ui-color-text, #18181b)",
                }}
              >
                <input
                  type="checkbox"
                  checked={vis}
                  onChange={() => toggleProjectVisible(row.id)}
                  aria-label={`Mostrar ou ocultar ${row.label}`}
                  style={{ marginTop: 2, accentColor: "var(--ui-color-primary, #2563eb)" }}
                />
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedId(row.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(row.id);
                    }
                  }}
                  style={{
                    flex: 1,
                    wordBreak: "break-word",
                    lineHeight: 1.3,
                    fontSize: 12,
                  }}
                  title="Clicar para selecionar no showroom"
                >
                  {row.label}
                </span>
              </label>

              {/* Incluir no merge */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginLeft: 20,
                  marginTop: 3,
                  cursor: "pointer",
                  color: "var(--ui-color-muted, #71717a)",
                  fontSize: 11,
                }}
              >
                <input
                  type="checkbox"
                  checked={mergeOn}
                  onChange={() => toggleMergeInclude(row.id)}
                  aria-label={`Incluir ${row.label} no merge para o workspace`}
                  style={{ accentColor: "var(--ui-color-primary, #2563eb)" }}
                />
                Incluir no merge
              </label>

              {/* Abrir no Workspace */}
              <div style={{ marginLeft: 20, marginTop: 5 }}>
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      sessionStorage.setItem(PIMO_PENDING_SINGLE_LOAD, JSON.stringify({ id: row.id }));
                    } catch {
                      /* ignore */
                    }
                    navigate("/");
                  }}
                  style={{ fontSize: 11, padding: "3px 8px" }}
                >
                  Abrir no Workspace
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Secção IDs carregados */}
      {allIds && allIds.length > 0 ? (
        <>
          <PanelDivider />
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--ui-color-muted, #71717a)",
            }}
          >
            IDs carregados ({allIds.length})
          </p>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              maxHeight: 120,
              overflowY: "auto",
            }}
          >
            {allIds.map((id) => (
              <li key={id}>
                <code
                  style={{
                    fontSize: 9,
                    color: "var(--ui-color-muted, #a1a1aa)",
                    wordBreak: "break-all",
                    lineHeight: 1.4,
                  }}
                >
                  {id}
                </code>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </aside>
  );
}
