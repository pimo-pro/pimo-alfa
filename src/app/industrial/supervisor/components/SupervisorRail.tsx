import { Link } from 'react-router-dom';

import IndustrialSpriteIcon, { type IndustrialSpriteIconName } from '@/components/icons/IndustrialSpriteIcon';
import { industrialBtnStyle } from '@/industrial/ui/layouts/industrialStyles';

import type { SupervisorRailView } from '../hooks/useSupervisorDashboard';

interface SupervisorRailProps {
  activeView: SupervisorRailView;
  onSelect: (view: SupervisorRailView) => void;
  alertCount?: number;
}

const RAIL_ITEMS: Array<{ view: SupervisorRailView; icon: IndustrialSpriteIconName; title: string }> = [
  { view: 'overview', icon: 'industrial-overview', title: 'Visão geral' },
  { view: 'stations', icon: 'industrial-stations', title: 'Estações' },
  { view: 'projects', icon: 'industrial-projects', title: 'Projetos' },
  { view: 'quality', icon: 'industrial-quality', title: 'Qualidade' },
  { view: 'time', icon: 'industrial-time', title: 'Tempo' },
  { view: 'chat', icon: 'industrial-chat', title: 'Chat' },
  { view: 'alerts', icon: 'industrial-alerts', title: 'Alertas' },
];

export default function SupervisorRail({ activeView, onSelect, alertCount = 0 }: SupervisorRailProps) {
  return (
    <nav style={{ display: 'grid', gap: 8, justifyItems: 'center' }} aria-label="Supervisor rail">
      <div
        title="Supervisor Industrial"
        style={{
          ...industrialBtnStyle(true),
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          padding: 0,
        }}
      >
        <IndustrialSpriteIcon name="industrial-supervisor" size={18} />
      </div>

      {RAIL_ITEMS.map((item) => (
        <button
          key={item.view}
          type="button"
          title={item.title}
          onClick={() => onSelect(item.view)}
          style={{
            ...industrialBtnStyle(activeView === item.view),
            width: 40,
            height: 40,
            padding: 0,
            position: 'relative',
          }}
        >
          <IndustrialSpriteIcon name={item.icon} size={16} />
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

      <Link
        to="/industrial/work-orders"
        title="Work Orders"
        style={{
          ...industrialBtnStyle(false),
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          textDecoration: 'none',
          padding: 0,
        }}
      >
        <IndustrialSpriteIcon name="industrial-stations" size={16} />
      </Link>
    </nav>
  );
}
