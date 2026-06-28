import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { SavedProjectRecord } from "../../core/projects/types";
import { buildProjetosPagePath } from "./projetosPageSlug";
import {
  buildProjetosElementGroups,
  type ProjetosElementRow,
} from "./projetosSnapshotGroups";

type SectionProps = {
  title: string;
  rows: ProjetosElementRow[];
  emptyLabel: string;
  projectSlug: string;
  activeBoxId?: string;
  activePieceId?: string;
  defaultOpen?: boolean;
};

function buildFocusPath(projectSlug: string, row: ProjetosElementRow): string {
  const base = `/PROJETOS/${encodeURIComponent(projectSlug)}`;
  if (!row.boxId) return base;
  const boxPart = encodeURIComponent(row.boxId);
  if (!row.pieceId || row.pieceId === row.boxId) return `${base}/${boxPart}`;
  return `${base}/${boxPart}/${encodeURIComponent(row.pieceId)}`;
}

function ProjetosSection({
  title,
  rows,
  emptyLabel,
  projectSlug,
  activeBoxId,
  activePieceId,
  defaultOpen = true,
}: SectionProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section style={{ marginBottom: 4 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 0",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "#52525b",
        }}
      >
        <span>{title}</span>
        <span style={{ fontWeight: 400, color: "#71717a" }}>
          {rows.length} {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? (
        rows.length === 0 ? (
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#a1a1aa" }}>{emptyLabel}</p>
        ) : (
          <ul style={{ listStyle: "none", margin: "0 0 8px", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {rows.map((row) => {
              const isActive =
                (activePieceId && row.pieceId === activePieceId) ||
                (!activePieceId && activeBoxId && row.boxId === activeBoxId && row.id === activeBoxId);
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => navigate(buildFocusPath(projectSlug, row))}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: isActive ? "1px solid #f97316" : "1px solid transparent",
                      background: isActive ? "#fff7ed" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#18181b", lineHeight: 1.3 }}>
                      {row.label}
                    </div>
                    {row.subtitle ? (
                      <div style={{ fontSize: 10, color: "#71717a", marginTop: 2, lineHeight: 1.3 }}>
                        {row.subtitle}
                      </div>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : null}
      <div style={{ height: 1, background: "#e4e4e7", margin: "4px 0" }} />
    </section>
  );
}

type Props = {
  snapshot: SavedProjectRecord | null;
};

export default function ProjetosElementSections({ snapshot }: Props) {
  const navigate = useNavigate();
  const { project: pageSlug, box: boxId, piece: pieceId } = useParams();
  const projectSlug = pageSlug ?? "";

  const groups = useMemo(() => buildProjetosElementGroups(snapshot), [snapshot]);

  if (!groups) {
    return (
      <div style={{ padding: 12, fontSize: 12, color: "#71717a" }}>
        Conteúdo do projeto indisponível.
      </div>
    );
  }

  const total =
    groups.boxes.length +
    groups.remates.length +
    groups.rodapes.length +
    groups.industrialPieces.length +
    groups.readyPieces.length +
    groups.standalonePieces.length;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "12px 10px",
        overflow: "auto",
        fontSize: 12,
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#71717a",
          }}
        >
          Projeto
        </p>
        <h2 style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#18181b", lineHeight: 1.3 }}>
          {groups.projectName}
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#71717a" }}>
          {total} elemento{total === 1 ? "" : "s"} de fabrico
        </p>
        <button
          type="button"
          onClick={() => navigate(buildProjetosPagePath({ name: groups.projectName }))}
          style={{
            marginTop: 8,
            padding: "4px 8px",
            fontSize: 11,
            borderRadius: 6,
            border: "1px solid #e4e4e7",
            background: !boxId && !pieceId ? "#fff7ed" : "#fff",
            cursor: "pointer",
          }}
        >
          Ver projeto completo
        </button>
      </div>

      <ProjetosSection
        title="Caixas"
        rows={groups.boxes}
        emptyLabel="Sem caixas no projeto."
        projectSlug={projectSlug}
        activeBoxId={boxId}
        activePieceId={pieceId}
      />
      <ProjetosSection
        title="Remates"
        rows={groups.remates}
        emptyLabel="Sem remates associados."
        projectSlug={projectSlug}
        activeBoxId={boxId}
        activePieceId={pieceId}
      />
      <ProjetosSection
        title="Roda pé"
        rows={groups.rodapes}
        emptyLabel="Sem roda pé no projeto."
        projectSlug={projectSlug}
        activeBoxId={boxId}
        activePieceId={pieceId}
      />
      <ProjetosSection
        title="Peças industriais"
        rows={groups.industrialPieces}
        emptyLabel="Sem peças paramétricas na cutlist."
        projectSlug={projectSlug}
        activeBoxId={boxId}
        activePieceId={pieceId}
      />
      <ProjetosSection
        title="Peças prontas"
        rows={groups.readyPieces}
        emptyLabel="Sem peças CAD importadas."
        projectSlug={projectSlug}
        activeBoxId={boxId}
        activePieceId={pieceId}
        defaultOpen={groups.readyPieces.length > 0}
      />
      <ProjetosSection
        title="Peças independentes"
        rows={groups.standalonePieces}
        emptyLabel="Sem peças independentes."
        projectSlug={projectSlug}
        activeBoxId={boxId}
        activePieceId={pieceId}
        defaultOpen={groups.standalonePieces.length > 0}
      />
    </div>
  );
}
