import { Link } from 'react-router-dom';

import {
  INDUSTRIAL_CONTROL_CLASS,
  ensureIndustrialInteractionStyles,
  industrialBtnStyle,
} from '@/industrial/ui/layouts/industrialStyles';

import type { SupervisorRailView } from '../hooks/useSupervisorDashboard';

interface SupervisorRailProps {
  activeView: SupervisorRailView;
  onSelect: (view: SupervisorRailView) => void;
  alertCount?: number;
}

const RAIL_LABEL_STYLE = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.3,
  textTransform: 'uppercase' as const,
};

const RAIL_ITEMS: Array<{ view: SupervisorRailView; label: string; title: string }> = [
  { view: 'overview', label: 'IND', title: 'Visão geral' },
  { view: 'stations', label: 'EST', title: 'Estações' },
  { view: 'projects', label: 'PRJ', title: 'Projetos' },
  { view: 'quality', label: 'QUA', title: 'Qualidade' },
  { view: 'time', label: 'TMP', title: 'Tempo' },
  { view: 'chat', label: 'CHT', title: 'Chat' },
  { view: 'alerts', label: 'ALT', title: 'Alertas' },
];

export default function SupervisorRail({ activeView, onSelect, alertCount = 0 }: SupervisorRailProps) {
  ensureIndustrialInteractionStyles();

  return (
    <nav style={{ display: 'grid', gap: 8, justifyItems: 'center' }} aria-label="Supervisor rail">
      <div
        title="Supervisor Industrial · fluxo real"
        className={INDUSTRIAL_CONTROL_CLASS}
        data-active="true"
        style={{
          ...industrialBtnStyle(true),
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          padding: 0,
          ...RAIL_LABEL_STYLE,
          boxShadow: '0 0 0 2px rgba(59,130,246,0.45)',
        }}
      >
        SUP
      </div>

      {RAIL_ITEMS.map((item) => (
        <button
          key={item.view}
          type="button"
          className={INDUSTRIAL_CONTROL_CLASS}
          data-active={activeView === item.view ? 'true' : undefined}
          title={item.title}
          onClick={() => onSelect(item.view)}
          style={{
            ...industrialBtnStyle(activeView === item.view),
            width: 40,
            height: 40,
            padding: 0,
            position: 'relative',
            ...RAIL_LABEL_STYLE,
          }}
        >
          {item.label}
          {item.view === 'alerts' && alertCount > 0 ? (
            <span
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                minWidth: 14,
                height: 14,
                borderRadius: 999,
                background: '#dc2626',
                color: '#fff',
                fontSize: 9,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          ) : null}
        </button>
      ))}

      <div style={{ height: 1, width: '100%', background: 'var(--border, #334155)', margin: '4px 0' }} />

      <Link
        to="/industrial/operador"
        title="Operador"
        className={INDUSTRIAL_CONTROL_CLASS}
        style={{
          ...industrialBtnStyle(false),
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          textDecoration: 'none',
          padding: 0,
          ...RAIL_LABEL_STYLE,
        }}
      >
        OPR
      </Link>

      <Link
        to="/industrial/work-orders"
        title="Ordens de trabalho"
        className={INDUSTRIAL_CONTROL_CLASS}
        style={{
          ...industrialBtnStyle(false),
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          textDecoration: 'none',
          padding: 0,
          ...RAIL_LABEL_STYLE,
        }}
      >
        WOS
      </Link>
    </nav>
  );
}
