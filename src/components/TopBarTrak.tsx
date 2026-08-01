import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '@/auth/useAuth';
import { orderPageLabel, resolveTrakPageLabel } from '@/chrome/resolveTrakPageLabel';
import { useTopBarTrakIndicators } from '@/chrome/useTopBarTrakIndicators';
import { fetchWorkOrderDetail } from '@/industrial/api/workOrderActions';
import {
  isInternalProjectId,
  resolveProjectIdentity,
} from '@/core/projects/projectIdentity';
import { INDUSTRIAL_STATIONS, type IndustrialStation } from '@/industrial/work-orders/types';

import Button from './ui/Button';
import Toolbar from './ui/Toolbar';
import './ui/ui.css';

const DOT = '\u00b7';

function isStation(value: string | undefined): value is IndustrialStation {
  return !!value && (INDUSTRIAL_STATIONS as readonly string[]).includes(value);
}

/**
 * Barra TRK abaixo do Header PRO — nunca substitui o Header.
 */
export default function TopBarTrak() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const base = useMemo(() => resolveTrakPageLabel(pathname), [pathname]);

  const [orderStation, setOrderStation] = useState<IndustrialStation | undefined>();
  const [pageLabel, setPageLabel] = useState(base.label);
  const [projectSlug, setProjectSlug] = useState<string | undefined>(base.projectSlug);

  useEffect(() => {
    setPageLabel(base.label);
    setOrderStation(undefined);
    setProjectSlug(base.projectSlug);

    if (!base.workOrderId) return;

    let cancelled = false;
    void fetchWorkOrderDetail(base.workOrderId).then((detail) => {
      if (cancelled) return;
      const station = detail.order?.station;
      if (isStation(station)) {
        setOrderStation(station);
        setPageLabel(orderPageLabel(station));
      }
      const projectId = detail.order?.projectId;
      if (projectId) {
        const identity = resolveProjectIdentity(projectId);
        if (identity?.slug && !isInternalProjectId(identity.slug)) {
          setProjectSlug(identity.slug);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [base.label, base.workOrderId, base.projectSlug]);

  const station = base.station ?? orderStation;
  const indicators = useTopBarTrakIndicators({
    station,
    workOrderId: base.workOrderId,
  });

  const indicatorsText = indicators.loading
    ? 'A carregar\u2026'
    : `${indicators.activeTasks} tarefa(s) activa(s) ${DOT} ${indicators.orders} ordem(ns) ${DOT} ${indicators.online ? 'online' : 'offline'}`;

  return (
    <Toolbar
      left={
        <div className="ui-nav-links" style={{ flexWrap: 'wrap', gap: 'var(--ui-space-3)' }}>
          <span className="ui-nav-link" style={{ fontWeight: 700, cursor: 'default' }}>
            PIMO-TRAK Industrial
          </span>
          <span className="ui-nav-link" style={{ cursor: 'default' }} aria-current="page">
            {pageLabel}
          </span>
          {projectSlug ? (
            <span className="ui-nav-link" style={{ cursor: 'default', fontWeight: 600 }}>
              {projectSlug}
            </span>
          ) : null}
          <span
            className="ui-link"
            style={{ fontSize: 13, color: 'var(--ui-color-text-muted, #71717a)' }}
            title={indicatorsText}
          >
            {indicatorsText}
          </span>
        </div>
      }
      right={
        <>
          <span className="ui-link">{user?.username ?? 'Utilizador'}</span>
          <Button type="button" onClick={logout}>
            Logout
          </Button>
        </>
      }
    />
  );
}
