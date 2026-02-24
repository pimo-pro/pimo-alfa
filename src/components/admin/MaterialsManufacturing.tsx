import MaterialPanel from "../layout/right-panel/MaterialPanel";

export default function MaterialsManufacturing() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Vista complementar focada em ajustes visuais/manufatura.
        O CRUD principal de materiais permanece em "Materials" (Gestão de Materiais).
      </div>
      <MaterialPanel />
    </div>
  );
}
