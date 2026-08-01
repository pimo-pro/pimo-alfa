import { Link, useLocation } from 'react-router-dom';

import { INDUSTRIAL_STATIONS, STATION_LABELS, type IndustrialStation } from '@/industrial/work-orders/types';
import {
  INDUSTRIAL_CONTROL_CLASS,
  ensureIndustrialInteractionStyles,
  industrialBtnStyleLight,
} from '@/industrial/ui/layouts/industrialStyles';

interface StationSidebarProps {
  activeStation: IndustrialStation;
  notificationCount?: number;
  onToggleNotifications?: () => void;
  onToggleChat?: () => void;
  chatOpen?: boolean;
}

const RAIL_LABEL_STYLE = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.3,
  textTransform: 'uppercase' as const,
};

const STATION_RAIL_LABEL: Record<IndustrialStation, string> = {
  warehouse: 'SUP',
  nesting: 'NES',
  drill: 'DRI',
  orlar: 'ORL',
  montagem: 'MON',
  embalagem: 'EMB',
};

export default function StationSidebar({
  activeStation,
  notificationCount = 0,
  onToggleNotifications,
  onToggleChat,
  chatOpen = false,
}: StationSidebarProps) {
  ensureIndustrialInteractionStyles();
  const location = useLocation();

  return (
    <nav
      style={{
        display: 'grid',
        gap: 8,
        justifyItems: 'center',
        alignContent: 'start',
        color: '#1e1e1e',
        lineHeight: 1.5,
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
            className={INDUSTRIAL_CONTROL_CLASS}
            data-active={active ? 'true' : undefined}
            style={{
              ...industrialBtnStyleLight(active),
              width: 40,
              height: 40,
              display: 'grid',
              placeItems: 'center',
              textDecoration: 'none',
              padding: 0,
              ...RAIL_LABEL_STYLE,
            }}
          >
            {STATION_RAIL_LABEL[station]}
          </Link>
        );
      })}

      <div style={{ height: 1, width: '100%', background: 'var(--border, #334155)', margin: '4px 0' }} />

      {onToggleNotifications ? (
        <button
          type="button"
          className={INDUSTRIAL_CONTROL_CLASS}
          title="Notificações"
          onClick={onToggleNotifications}
          style={{
            ...industrialBtnStyleLight(false),
            width: 40,
            height: 40,
            padding: 0,
            position: 'relative',
            ...RAIL_LABEL_STYLE,
          }}
        >
          NTF
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
          className={INDUSTRIAL_CONTROL_CLASS}
          title="Chat industrial"
          onClick={onToggleChat}
          style={{
            ...industrialBtnStyleLight(chatOpen),
            width: 40,
            height: 40,
            padding: 0,
            ...RAIL_LABEL_STYLE,
          }}
          data-active={chatOpen ? 'true' : undefined}
        >
          CHT
        </button>
      ) : null}

      <Link
        to="/industrial/work-orders"
        title="Ordens de trabalho"
        className={INDUSTRIAL_CONTROL_CLASS}
        style={{
          ...industrialBtnStyleLight(false),
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
