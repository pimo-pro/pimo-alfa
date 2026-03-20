import type { MaterialOption } from "./materialOptions";

export type MaterialPickerModalProps = {
  materialsLoading: boolean;
  materialsList: MaterialOption[];
  onClose: () => void;
  onSelectMaterial: (material: MaterialOption) => void;
};

export function MaterialPickerModal({
  materialsLoading,
  materialsList,
  onClose,
  onSelectMaterial,
}: MaterialPickerModalProps) {
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="modal-card"
        style={{ maxWidth: 360, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">Selecionar Material</div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div style={{ padding: "0 16px 16px", overflowY: "auto", flex: 1 }}>
          {materialsLoading && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              A carregar materiais...
            </p>
          )}
          {materialsList.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Nenhum material no registo. Adicione em Admin → Materials.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {materialsList.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="card"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      textAlign: "left",
                      cursor: "pointer",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.04)",
                    }}
                    onClick={() => onSelectMaterial(m)}
                  >
                    {m.color && (
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: m.color,
                          border: "1px solid rgba(255,255,255,0.2)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)" }}>{m.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {m.espessura ?? "—"} mm · {m.precoPorM2 ?? "—"} €/m²
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
