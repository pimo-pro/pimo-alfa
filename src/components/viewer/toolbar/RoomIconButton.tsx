import { useCallback, useMemo } from "react";
import { useProject } from "../../../context/useProject";
import { usePimoViewerContext } from "../../../hooks/usePimoViewerContext";
import { wallStore, useWallStore } from "../../../stores/wallStore";
import { uiStore, useUiStore } from "../../../stores/uiStore";
import { LEFT_TOOLBAR_IDS } from "../../layout/left-toolbar/LeftToolbar";
import { hasPersistedRoomWalls } from "../../../utils/roomWorkspaceBounds";
import { Icon } from "@/components/icons";

/** Atalho na toolbar: mesmas dimensões padrão ao criar sala instantaneamente. */
const DEFAULT_ROOM_WIDTH_M = 4;
const DEFAULT_ROOM_DEPTH_M = 3;
const DEFAULT_ROOM_HEIGHT_M = 2.4;

export default function RoomIconButton() {
  const { viewerApi } = usePimoViewerContext();
  const { actions } = useProject();
  const setSelectedTool = useUiStore((state) => state.setSelectedTool);
  const walls = useWallStore((state) => state.walls);

  const roomPresent = useMemo(() => {
    if (viewerApi?.getRoomExists?.()) return true;
    return hasPersistedRoomWalls(walls);
  }, [viewerApi, walls]);

  const isActive = roomPresent;

  const handleClick = useCallback(() => {
    if (!roomPresent) {
      wallStore.getState().setRoomLayoutFromMeters(DEFAULT_ROOM_WIDTH_M, DEFAULT_ROOM_DEPTH_M, DEFAULT_ROOM_HEIGHT_M, 4);
      setSelectedTool(LEFT_TOOLBAR_IDS.SALA);
      const scheduleReposition = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            actions.repositionWorkspaceBoxesInsideRoom();
          });
        });
      };
      scheduleReposition();
      return;
    }
    wallStore.getState().clearRoom();
    viewerApi?.removeRoom?.();
    setSelectedTool(LEFT_TOOLBAR_IDS.HOME);
    uiStore.getState().clearSelection();
  }, [actions, roomPresent, setSelectedTool, viewerApi]);

  /** Mesmo encaixe que `unifiedBubbleStyle` (28×28, ícone 22) para não aumentar a altura da barra; verde via token. */
  const bubbleStyle = {
    width: 28,
    height: 28,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    border: "none" as const,
    borderRadius: 4,
    cursor: "pointer" as const,
    marginLeft: 4,
    color: "var(--status-done-color)",
    background: isActive ? "var(--toolbar-pressed-bg)" : "transparent",
  };

  return (
    <button
      type="button"
      title={roomPresent ? "Remover sala e fechar painel" : "Criar sala (4×3×2,4 m) e abrir painel"}
      aria-label={roomPresent ? "Remover sala" : "Criar sala"}
      aria-pressed={isActive}
      onClick={handleClick}
      style={bubbleStyle}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = "var(--viewer-toolbar-hover-bg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isActive ? "var(--toolbar-pressed-bg)" : "transparent";
      }}
    >
      <Icon name="room" size={22} aria-hidden />
    </button>
  );
}
