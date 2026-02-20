import { useUiStore } from "../../../stores/uiStore";
import { LEFT_TOOLBAR_IDS } from "../../layout/left-toolbar/LeftToolbar";

export default function RoomIconButton() {
  const selectedTool = useUiStore((state) => state.selectedTool);
  const setSelectedTool = useUiStore((state) => state.setSelectedTool);
  const isActive = selectedTool === LEFT_TOOLBAR_IDS.SALA;

  return (
    <button
      type="button"
      title="Abrir painel da Sala"
      aria-label="Abrir painel da Sala"
      aria-pressed={isActive}
      onClick={() => setSelectedTool(LEFT_TOOLBAR_IDS.SALA)}
      style={{
        fontSize: 12,
        background: isActive ? "rgba(59, 130, 246, 0.25)" : "transparent",
      }}
    >
      <span className="viewer-toolbar-icon" aria-hidden>
        ▢
      </span>
    </button>
  );
}
