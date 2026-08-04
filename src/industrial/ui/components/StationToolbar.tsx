import type { StationToolMode } from './stationTypes';
import {
  INDUSTRIAL_CONTROL_CLASS,
  ensureIndustrialInteractionStyles,
  industrialBtnStyle,
  industrialBtnStyleLight,
} from '@/industrial/ui/layouts/industrialStyles';
import { useIndustrialTone } from '@/industrial/ui/layouts/industrialTheme';

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
  const tone = useIndustrialTone();
  const btn = (active: boolean) =>
    tone === 'light' ? industrialBtnStyleLight(active) : industrialBtnStyle(active);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} data-station-tone={tone}>
      <button
        type="button"
        className={INDUSTRIAL_CONTROL_CLASS}
        onClick={() => onToolMode('move')}
        style={btn(toolMode === 'move')}
      >
        Mover
      </button>
      <button
        type="button"
        className={INDUSTRIAL_CONTROL_CLASS}
        onClick={() => onToolMode('rotate')}
        style={btn(toolMode === 'rotate')}
      >
        Rodar
      </button>
      <button
        type="button"
        className={INDUSTRIAL_CONTROL_CLASS}
        onClick={onToggleSnap}
        style={btn(snapEnabled)}
      >
        Snap
      </button>
      {onReload ? (
        <button type="button" className={INDUSTRIAL_CONTROL_CLASS} onClick={onReload} style={btn(false)}>
          Actualizar
        </button>
      ) : null}
      {onToggleSidebar ? (
        <button
          type="button"
          className={INDUSTRIAL_CONTROL_CLASS}
          title="Ocultar/mostrar histórico"
          onClick={onToggleSidebar}
          style={btn(sidebarOpen)}
        >
          Histórico
        </button>
      ) : null}
    </div>
  );
}
