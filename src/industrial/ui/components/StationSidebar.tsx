import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

import {
  extractIndustrialProjectSlug,
  industrialRailHref,
} from '@/chrome/industrialProjectNav';
import { INDUSTRIAL_STATIONS, STATION_LABELS, type IndustrialStation } from '@/industrial/work-orders/types';
import {
  INDUSTRIAL_CONTROL_CLASS,
  ensureIndustrialInteractionStyles,
  industrialBtnStyle,
  industrialBtnStyleLight,
} from '@/industrial/ui/layouts/industrialStyles';
import { industrialUi, useIndustrialTone } from '@/industrial/ui/layouts/industrialTheme';

interface StationSidebarProps {
  activeStation: IndustrialStation;
  /** Slug do projecto aberto — preserva nas tabs SUP/NES/DRI/... */
  projectSlug?: string | null;
  notificationCount?: number;
  onToggleNotifications?: () => void;
  onToggleChat?: () => void;
  chatOpen?: boolean;
  onToggleFerragens3D?: () => void;
  ferragens3DOpen?: boolean;
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
  projectSlug: projectSlugProp = null,
  notificationCount = 0,
  onToggleNotifications,
  onToggleChat,
  chatOpen = false,
  onToggleFerragens3D,
  ferragens3DOpen = false,
}: StationSidebarProps) {
  ensureIndustrialInteractionStyles();
  const location = useLocation();
  const tone = useIndustrialTone();
  const ui = industrialUi(tone);
  const btn = (active: boolean) =>
    tone === 'light' ? industrialBtnStyleLight(active) : industrialBtnStyle(active);

  const projectSlug = useMemo(() => {
    const fromProp = projectSlugProp?.trim() || null;
    if (fromProp) return fromProp;
    return extractIndustrialProjectSlug(location.pathname);
  }, [projectSlugProp, location.pathname]);

  return (
    <nav
      style={{
        display: 'grid',
        gap: 8,
        justifyItems: 'center',
        alignContent: 'start',
        color: ui.textStrong,
        lineHeight: 1.5,
      }}
      aria-label="Navegacao de estacoes"
      data-station-tone={tone}
    >
      {INDUSTRIAL_STATIONS.map((station) => {
        const path = industrialRailHref(station, projectSlug);
        const active =
          station === activeStation ||
          location.pathname === path ||
          (projectSlug
            ? location.pathname.startsWith(`/industrial/work-orders/${station}/`)
            : location.pathname === `/industrial/work-orders/${station}`) ||
          (station === 'warehouse' &&
            (location.pathname === '/industrial/supervisor' ||
              location.pathname.startsWith('/industrial/supervisor/')));
        return (
          <Link
            key={station}
            to={path}
            title={STATION_LABELS[station]}
            className={INDUSTRIAL_CONTROL_CLASS}
            data-active={active ? 'true' : undefined}
            style={{
              ...btn(active),
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

      <div style={{ height: 1, width: '100%', background: ui.panelBorder, margin: '4px 0' }} />

      {onToggleFerragens3D ? (
        <button
          type="button"
          className={INDUSTRIAL_CONTROL_CLASS}
          title="Ferragens 3D"
          onClick={onToggleFerragens3D}
          data-active={ferragens3DOpen ? 'true' : undefined}
          style={{
            ...btn(Boolean(ferragens3DOpen)),
            width: 40,
            height: 40,
            padding: 0,
            ...RAIL_LABEL_STYLE,
          }}
        >
          F3D
        </button>
      ) : null}

      {onToggleNotifications ? (
        <button
          type="button"
          className={INDUSTRIAL_CONTROL_CLASS}
          title="Notificacoes"
          onClick={onToggleNotifications}
          style={{
            ...btn(false),
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
                padding: '0 3px',
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
          title="Chat"
          onClick={onToggleChat}
          data-active={chatOpen ? 'true' : undefined}
          style={{
            ...btn(Boolean(chatOpen)),
            width: 40,
            height: 40,
            padding: 0,
            ...RAIL_LABEL_STYLE,
          }}
        >
          CHT
        </button>
      ) : null}
    </nav>
  );
}
