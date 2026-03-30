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

  return (
    <button
      type="button"
      title={roomPresent ? "Remover sala e fechar painel" : "Criar sala (4×3×2,4 m) e abrir painel"}
      aria-label={roomPresent ? "Remover sala" : "Criar sala"}
      aria-pressed={isActive}
      onClick={handleClick}
      style={{
        fontSize: 12,
        background: isActive ? "rgba(59, 130, 246, 0.25)" : "transparent",
      }}
    >
      <span className="viewer-toolbar-icon" aria-hidden>
        <Icon name="room" size={16} aria-hidden />
      </span>
    </button>
  );
}
