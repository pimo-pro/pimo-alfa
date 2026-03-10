/**
 * Menu flutuante de seleção de vista da câmera (Top, Front, Isometric, etc.).
 */

export type CameraViewPreset = "top" | "bottom" | "front" | "back" | "right" | "left" | "isometric";

const CAMERA_PRESETS: Array<{ id: CameraViewPreset; label: string }> = [
  { id: "top", label: "Vista Superior (Top)" },
  { id: "bottom", label: "Vista Inferior (Bottom)" },
  { id: "front", label: "Vista Frontal (Front)" },
  { id: "back", label: "Vista Traseira (Back)" },
  { id: "right", label: "Vista Lateral Direita (Right)" },
  { id: "left", label: "Vista Lateral Esquerda (Left)" },
  { id: "isometric", label: "Vista Isométrica (Isometric)" },
];

export type CameraViewMenuProps = {
  onSelect: (_preset: CameraViewPreset) => void;
  onClose: () => void;
};

export default function CameraViewMenu({ onSelect, onClose }: CameraViewMenuProps) {
  return (
    <div
      role="menu"
      aria-label="Vistas da câmera"
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: 4,
        minWidth: 220,
        padding: "6px 0",
        background: "var(--popover-bg)",
        border: "1px solid var(--popover-border)",
        borderRadius: 8,
        boxShadow: "var(--popover-shadow)",
        zIndex: 1000,
      }}
    >
      {CAMERA_PRESETS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="menuitem"
          onClick={() => {
            onSelect(id);
            onClose();
          }}
          style={{
            display: "block",
            width: "100%",
            padding: "6px 12px",
            border: "none",
            background: "transparent",
            color: "var(--text-main)",
            fontSize: 12,
            textAlign: "left",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
