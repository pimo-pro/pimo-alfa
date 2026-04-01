import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import { PIMO_PENDING_SINGLE_LOAD } from "../../workspace/PendingSingleLoadEffect";
import { useShowroomStore } from "./showroomStore";

export type ShowroomVisibilityRow = {
  id: string;
  label: string;
};

type Props = {
  rows: ShowroomVisibilityRow[];
};

/**
 * Lista lateral: visibilidade por projeto (estado local do showroom).
 */
export function ShowroomVisibilityPanel({ rows }: Props) {
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
        flex: "0 0 220px",
        minWidth: 200,
        padding: 12,
        borderRadius: 8,
        border: "1px solid var(--border, #ccc)",
        background: "var(--ui-color-surface, #fafafa)",
        alignSelf: "stretch",
      }}
    >
      <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600 }}>Visibilidade</p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row) => {
          const vis = entities[row.id]?.visible ?? true;
          const mergeOn = mergeIncludeById[row.id] !== false;
          return (
            <li key={row.id}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: selectedId === row.id ? 600 : 400,
                }}
              >
                <input
                  type="checkbox"
                  checked={vis}
                  onChange={() => toggleProjectVisible(row.id)}
                  aria-label={`Mostrar ou ocultar ${row.label}`}
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
                  style={{ flex: 1, wordBreak: "break-all" }}
                  title="Clicar para selecionar no showroom"
                >
                  {row.label}
                </span>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  marginLeft: 24,
                  marginTop: 4,
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <input
                  type="checkbox"
                  checked={mergeOn}
                  onChange={() => toggleMergeInclude(row.id)}
                  aria-label={`Incluir ${row.label} no merge para o workspace`}
                />
                Incluir no merge
              </label>
              <div style={{ marginLeft: 24, marginTop: 8 }}>
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
                >
                  Abrir no Workspace
                </Button>
              </div>
              <code style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginLeft: 24 }}>
                {row.id}
              </code>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
