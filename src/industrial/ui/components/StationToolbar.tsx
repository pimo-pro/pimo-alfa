import type { StationToolMode } from './stationTypes';
import { industrialBtnStyle } from '@/industrial/ui/layouts/industrialStyles';

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
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      <button type="button" onClick={() => onToolMode('move')} style={industrialBtnStyle(toolMode === 'move')}>
        Mover
      </button>
      <button type="button" onClick={() => onToolMode('rotate')} style={industrialBtnStyle(toolMode === 'rotate')}>
        Rodar
      </button>
      <button type="button" onClick={onToggleSnap} style={industrialBtnStyle(snapEnabled)}>
        Snap {snapEnabled ? 'ON' : 'OFF'}
      </button>
      {onReload ? (
        <button type="button" onClick={onReload} style={industrialBtnStyle(false)}>
          Recarregar
        </button>
      ) : null}
      {onToggleSidebar ? (
        <button type="button" onClick={onToggleSidebar} style={industrialBtnStyle(sidebarOpen)}>
          {sidebarOpen ? 'Ocultar histórico' : 'Mostrar histórico'}
        </button>
      ) : null}
    </div>
  );
}
