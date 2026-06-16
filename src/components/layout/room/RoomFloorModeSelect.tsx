import type { RoomFloorMode } from "../../../3d/viewer-engine/room/roomEngineTypes";
import {
  getRoomFloorModeOption,
  ROOM_FLOOR_MODE_OPTIONS,
} from "../../../3d/viewer-engine/room/roomFloorModeUi";

type Props = {
  value: RoomFloorMode;
  onChange: (mode: RoomFloorMode) => void;
  labelMinWidth?: number;
};

export function RoomFloorModeSelect({ value, onChange, labelMinWidth = 110 }: Props) {
  const selected = getRoomFloorModeOption(value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="panel-field-row">
        <label className="panel-label" style={{ minWidth: labelMinWidth }} title="Modo do overlay de piso da sala">
          Piso da sala
        </label>
        <select
          className="input input-sm"
          value={value}
          title={selected.description}
          onChange={(e) => onChange(e.target.value as RoomFloorMode)}
        >
          {ROOM_FLOOR_MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 8px",
          borderRadius: 6,
          border: "1px solid var(--border-subtle)",
          background: "var(--surface-muted, rgba(15,23,42,0.04))",
        }}
        title={selected.description}
      >
        <div
          aria-hidden
          style={{
            width: 52,
            height: 36,
            borderRadius: 4,
            background: "var(--ground-preview-bg, #d4dae2)",
            position: "relative",
            flexShrink: 0,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: `${selected.previewScale * 100}%`,
              height: `${selected.previewScale * 100}%`,
              transform: "translate(-50%, -50%)",
              borderRadius: 2,
              background: selected.previewColor,
              boxShadow: "0 0 0 1px rgba(100,116,139,0.45)",
            }}
          />
        </div>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.35, color: "var(--text-muted)" }}>
          {selected.description}
        </p>
      </div>
    </div>
  );
}
