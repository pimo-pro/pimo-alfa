import type { StationToolMode } from './stationTypes';
import {
  INDUSTRIAL_CONTROL_CLASS,
  ensureIndustrialInteractionStyles,
  industrialBtnStyleLight,
} from '@/industrial/ui/layouts/industrialStyles';

interface StationToolbarProps {
  toolMode: StationToolMode;
  snapEnabled: boolean;
  onToolMode: (mode: StationToolMode) => void;
  onToggleSnap: () => void;
  onReload?: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export default function StationToolbar({
  toolMode,
  snapEnabled,
  onToolMode,
  onToggleSnap,
  onReload,
  onToggleSidebar,
  sidebarOpen = true,
}: StationToolbarProps) {
  ensureIndustrialInteractionStyles();

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      <button
        type="button"
        className={INDUSTRIAL_CONTROL_CLASS}
        onClick={() => onToolMode('move')}
        style={industrialBtnStyleLight(toolMode === 'move')}
      >
        Mover
      </button>
      <button
        type="button"
        className={INDUSTRIAL_CONTROL_CLASS}
        onClick={() => onToolMode('rotate')}
        style={industrialBtnStyleLight(toolMode === 'rotate')}
      >
        Rodar
      </button>
      <button
        type="button"
        className={INDUSTRIAL_CONTROL_CLASS}
        onClick={onToggleSnap}
        style={industrialBtnStyleLight(snapEnabled)}
      >
        Snap
      </button>
      {onReload ? (
        <button type="button" className={INDUSTRIAL_CONTROL_CLASS} onClick={onReload} style={industrialBtnStyleLight(false)}>
          Actualizar
        </button>
      ) : null}
      {onToggleSidebar ? (
        <button
          type="button"
          className={INDUSTRIAL_CONTROL_CLASS}
          title="Ocultar/mostrar histórico"
          onClick={onToggleSidebar}
          style={industrialBtnStyleLight(sidebarOpen)}
        >
          Histórico
        </button>
      ) : null}
    </div>
  );
}
