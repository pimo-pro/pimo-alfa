import { useMemo, memo, useCallback } from "react";
import Panel from "./Panel";
import { useProject } from "../../context/useProject";
import { cutlistComPrecoFromBox } from "../../core/manufacturing/cutlistFromBoxes";
import type { BoxModule } from "../../core/types";

const DOOR_LABELS: Record<string, string> = {
  sem_porta: "Sem porta",
  porta_simples: "Porta simples",
  porta_dupla: "Porta dupla",
  porta_correr: "Porta de correr",
};

const microTextStyle: React.CSSProperties = { fontSize: 12, lineHeight: 1.4, color: "var(--text-muted)" };
const buttonStyle: React.CSSProperties = {
  width: 28,
  height: 24,
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "var(--text-main)",
  cursor: "pointer",
  fontSize: 12,
};

type BoxSummary = { totalPecas: number; precoTotal: number };

interface CutListBoxCardProps {
  box: BoxModule;
  title: string;
  summary: BoxSummary;
  isSelected: boolean;
  onSelect: (_boxId: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

const CutListBoxCard = memo(function CutListBoxCard({
  box,
  title,
  summary,
  isSelected,
  onSelect,
  onDuplicate,
  onRemove,
}: CutListBoxCardProps) {
  const handleClick = useCallback(() => onSelect(box.id), [box.id, onSelect]);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") onSelect(box.id);
    },
    [box.id, onSelect]
  );
  const handleDuplicate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(box.id);
      setTimeout(onDuplicate, 0);
    },
    [box.id, onSelect, onDuplicate]
  );
  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(box.id);
      setTimeout(onRemove, 0);
    },
    [box.id, onSelect, onRemove]
  );

  const doorLabel = DOOR_LABELS[box.portaTipo] ?? "Sem porta";

  return (
    <Panel title={title}>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          cursor: "pointer",
          padding: 8,
          borderRadius: "var(--radius)",
          border: isSelected ? "1px solid rgba(59,130,246,0.45)" : "1px solid rgba(255,255,255,0.06)",
          background: isSelected ? "rgba(59,130,246,0.08)" : "transparent",
          outline: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {doorLabel} · {box.prateleiras} prateleiras · {box.gavetas} gavetas
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={handleDuplicate} style={buttonStyle} aria-label="Duplicar caixote" title="Duplicar">
              📄
            </button>
            <button type="button" onClick={handleRemove} style={buttonStyle} aria-label="Remover caixote" title="Remover">
              🗑
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
          <div>
            <div style={microTextStyle}>Dimensões</div>
            <div style={{ fontSize: 12, color: "var(--text-main)" }}>
              {box.dimensoes.largura}×{box.dimensoes.altura}×{box.dimensoes.profundidade} mm
            </div>
          </div>
          <div>
            <div style={microTextStyle}>Total de peças</div>
            <div style={{ fontSize: 12, color: "var(--text-main)" }}>{summary.totalPecas > 0 ? summary.totalPecas : "--"}</div>
          </div>
          <div>
            <div style={microTextStyle}>Preço estimado</div>
            <div style={{ fontSize: 12, color: "var(--text-main)" }}>
              {summary.precoTotal > 0 ? `${summary.precoTotal.toFixed(2)} €` : "--"}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
});

export default function CutListView() {
  const { project, actions } = useProject();

  const boxSummaries = useMemo(() => {
    const boxes = project.boxes ?? [];
    const result = new Map<string, BoxSummary>();
    for (const box of boxes) {
      const parametric = cutlistComPrecoFromBox(box, project.rules);
      const extractedByModel = project.extractedPartsByBoxId?.[box.id];
      const extracted = extractedByModel ? Object.values(extractedByModel).flat() : [];
      const cutlist = [...parametric, ...extracted];
      const totalPecas = cutlist.reduce((sum, i) => sum + i.quantidade, 0);
      const precoTotal = cutlist.reduce((s, i) => s + (i.precoTotal ?? 0), 0);
      result.set(box.id, { totalPecas, precoTotal });
    }
    return result;
  }, [project.boxes, project.rules, project.extractedPartsByBoxId]);

  const onSelect = useCallback((id: string) => actions.selectBox(id), [actions]);
  const onDuplicate = useCallback(() => actions.duplicateBox(), [actions]);
  const onRemove = useCallback(() => actions.removeBox(), [actions]);

  const boxes = project.boxes ?? [];
  const selectedBoxId = project.selectedBoxId;
  const selectedWorkspaceBoxId = project.selectedWorkspaceBoxId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
      {boxes.map((box, index) => (
        <CutListBoxCard
          key={box.id}
          box={box}
          title={box.nome || `Caixa ${index + 1}`}
          summary={boxSummaries.get(box.id) ?? { totalPecas: 0, precoTotal: 0 }}
          isSelected={box.id === selectedBoxId || box.id === selectedWorkspaceBoxId}
          onSelect={onSelect}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
