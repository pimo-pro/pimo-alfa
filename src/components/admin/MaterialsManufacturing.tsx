import MaterialPanel from "../layout/right-panel/MaterialPanel";

export default function MaterialsManufacturing() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Centro único de gestão de materiais: presets Wood Pack, overrides, qualidade (standard/premium/lacquered) e atribuição às caixas.
      </div>
      <MaterialPanel />
    </div>
  );
}
