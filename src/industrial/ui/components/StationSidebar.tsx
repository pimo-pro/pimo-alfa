import { Link, useLocation } from 'react-router-dom';

import { INDUSTRIAL_STATIONS, STATION_LABELS, type IndustrialStation } from '@/industrial/work-orders/types';
import { industrialBtnStyle } from '@/industrial/ui/layouts/industrialStyles';

interface StationSidebarProps {
  activeStation: IndustrialStation;
  notificationCount?: number;
  onToggleNotifications?: () => void;
  onToggleChat?: () => void;
  chatOpen?: boolean;
}

function StationIcon({ label }: { label: string }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>
      {label.slice(0, 3)}
    </span>
  );
}

export default function StationSidebar({
  activeStation,
  notificationCount = 0,
  onToggleNotifications,
  onToggleChat,
  chatOpen = false,
}: StationSidebarProps) {
  const location = useLocation();

  return (
    <nav
      style={{
        display: 'grid',
        gap: 8,
        justifyItems: 'center',
        alignContent: 'start',
      }}
      aria-label="Navegação de estações"
    >
      {INDUSTRIAL_STATIONS.map((station) => {
        const path = `/industrial/work-orders/${station}`;
        const active = station === activeStation || location.pathname === path;
        return (
          <Link
            key={station}
            to={path}
            title={STATION_LABELS[station]}
            style={{
              ...industrialBtnStyle(active),
              width: 40,
              height: 40,
              display: 'grid',
              placeItems: 'center',
              textDecoration: 'none',
              padding: 0,
            }}
          >
            <StationIcon label={STATION_LABELS[station]} />
          </Link>
        );
      })}

      <div style={{ height: 1, width: '100%', background: 'var(--border, #334155)', margin: '4px 0' }} />

      {onToggleNotifications ? (
        <button
          type="button"
          title="Notificações"
          onClick={onToggleNotifications}
          style={{
            ...industrialBtnStyle(false),
            width: 40,
            height: 40,
            padding: 0,
            position: 'relative',
          }}
        >
          🔔
          {notificationCount > 0 ? (
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
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          ) : null}
        </button>
      ) : null}

      {onToggleChat ? (
        <button
          type="button"
          title="Chat industrial"
          onClick={onToggleChat}
          style={{
            ...industrialBtnStyle(chatOpen),
            width: 40,
            height: 40,
            padding: 0,
          }}
        >
          💬
        </button>
      ) : null}

      <Link
        to="/industrial/work-orders"
        title="Lista de ordens"
        style={{
          ...industrialBtnStyle(false),
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          textDecoration: 'none',
          padding: 0,
          fontSize: 14,
        }}
      >
        ≡
      </Link>
    </nav>
  );
}
