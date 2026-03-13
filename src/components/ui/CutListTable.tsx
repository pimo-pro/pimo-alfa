import { useMemo, memo } from "react";
import { useProject } from "../../context/useProject";
import { cutlistComPrecoFromBox } from "../../core/manufacturing/cutlistFromBoxes";
import type { CutListItemComPreco } from "../../core/types";

const emptyStateStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 24,
  fontSize: 13,
  color: "var(--text-muted)",
  textAlign: "center",
  background: "rgba(255,255,255,0.02)",
  borderRadius: "var(--radius)",
  border: "1px dashed rgba(255,255,255,0.08)",
};

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse" };
const headerRowStyle: React.CSSProperties = { background: "var(--surface)" };
const badgeGlbStyle: React.CSSProperties = { fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(34,197,94,0.2)", color: "var(--text-main)" };
const badgeParamStyle: React.CSSProperties = { fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(59,130,246,0.2)", color: "var(--text-main)" };

interface CutListRowProps {
  item: CutListItemComPreco;
}

const CutListRow = memo(function CutListRow({ item }: CutListRowProps) {
  const isGlb = item.sourceType === "glb_importado";
  return (
    <tr>
      <td>{item.nome}</td>
      <td>
        <span style={isGlb ? badgeGlbStyle : badgeParamStyle}>
          {isGlb ? "GLB" : "Param."}
        </span>
      </td>
      <td>{item.dimensoes.largura} mm</td>
      <td>{item.dimensoes.altura} mm</td>
      <td>{item.espessura} mm</td>
      <td>{item.quantidade}</td>
      <td>{item.material}</td>
      <td>{item.precoUnitario} €</td>
      <td>{item.precoTotal} €</td>
    </tr>
  );
});

export default function CutListTable() {
  const { project } = useProject();
  const cutList = useMemo(() => {
    const boxes = project.boxes ?? [];
    const parametric = boxes.flatMap((box) => cutlistComPrecoFromBox(box, project.rules));
    const extracted = boxes.flatMap((box) =>
      Object.values(project.extractedPartsByBoxId?.[box.id] ?? {}).flat()
    );
    return [...parametric, ...extracted];
  }, [project.boxes, project.extractedPartsByBoxId, project.rules]);

  if (!cutList || cutList.length === 0) {
    return (
      <div style={emptyStateStyle}>
        Nenhuma peça. Adicione caixas e/ou modelos GLB para gerar a lista de cortes.
      </div>
    );
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <h2>Lista de Cortes (Cut List)</h2>
      <table style={tableStyle}>
        <thead>
          <tr style={headerRowStyle}>
            <th>Peça</th>
            <th>Origem</th>
            <th>Largura</th>
            <th>Altura</th>
            <th>Espessura</th>
            <th>Qtd</th>
            <th>Material</th>
            <th>Preço Unit.</th>
            <th>Preço Total</th>
          </tr>
        </thead>
        <tbody>
          {cutList.map((item) => (
            <CutListRow key={item.id} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}