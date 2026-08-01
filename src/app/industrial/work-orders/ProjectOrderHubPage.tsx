import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { industrialRailHref } from '@/chrome/industrialProjectNav';
import {
  buildIndustrialStationPath,
  resolveProjectIdentity,
} from '@/core/projects/projectIdentity';
import { fetchWorkOrders } from '@/industrial/api/workOrderActions';
import { IndustrialLayout, useIndustrialPageState } from '@/industrial/ui/components';
import StationSidebar from '@/industrial/ui/components/StationSidebar';
import { industrialUi, useIndustrialTone } from '@/industrial/ui/layouts/industrialTheme';
import {
  INDUSTRIAL_STATIONS,
  STATION_LABELS,
  type IndustrialStation,
  type IndustrialWorkOrder,
} from '@/industrial/work-orders/types';
import { resolveOrderProjectCode } from '@/industrial/work-orders/resolveWorkOrderPiece';

const DOT = '\u00b7';
const ELLIPSIS = '\u2026';

const ANCHOR_STATIONS: IndustrialStation[] = [
  'nesting',
  'drill',
  'orlar',
  'montagem',
  'embalagem',
];

/**
 * Hub de ordens por projecto + anchors #nesting|#drill|...
 * /industrial/work-orders/order/{project}
 */
export default function ProjectOrderHubPage() {
  useIndustrialPageState();
  const tone = useIndustrialTone();
  const ui = industrialUi(tone);
  const { orderOrProject, workOrderId } = useParams<{
    orderOrProject?: string;
    workOrderId?: string;
  }>();
  const location = useLocation();
  const key = (orderOrProject ?? workOrderId ?? '').trim();
  const identity = useMemo(() => resolveProjectIdentity(key), [key]);

  const [orders, setOrders] = useState<IndustrialWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!identity?.projectCode) {
        setLoading(false);
        setError('Projecto nao encontrado.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchWorkOrders({ projectCode: identity.projectCode });
        if (!cancelled) {
          setOrders(
            rows.filter(
              (o) => resolveOrderProjectCode(o).toUpperCase() === identity.projectCode,
            ),
          );
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar ordens.');
          setLoading(false);
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [identity?.projectCode]);

  useEffect(() => {
    const hash = location.hash.replace(/^#/, '') as IndustrialStation;
    if (!hash || !ANCHOR_STATIONS.includes(hash)) return;
    const el = document.getElementById(`station-${hash}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash, orders, loading]);

  const byStation = useMemo(() => {
    const map = new Map<IndustrialStation, IndustrialWorkOrder[]>();
    for (const station of INDUSTRIAL_STATIONS) map.set(station, []);
    for (const order of orders) {
      const list = map.get(order.station) ?? [];
      list.push(order);
      map.set(order.station, list);
    }
    return map;
  }, [orders]);

  const title = identity?.name || 'Projecto';
  const slug = identity?.slug || key;
  const hashStation = location.hash.replace(/^#/, '');
  const activeStation: IndustrialStation =
    ANCHOR_STATIONS.includes(hashStation as IndustrialStation)
      ? (hashStation as IndustrialStation)
      : 'nesting';

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', minHeight: '100%' }}>
      <aside style={{ flexShrink: 0, padding: '16px 8px' }}>
        <StationSidebar activeStation={activeStation} projectSlug={slug} />
      </aside>
      <div style={{ flex: 1, minWidth: 0 }}>
        <IndustrialLayout
          title={`Ordens ${DOT} ${title}`}
          description={
            loading
              ? `A carregar${ELLIPSIS}`
              : `${orders.length} ordem(ns) ${DOT} ${identity?.projectCode ?? DOT}`
          }
        >
          {error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {ANCHOR_STATIONS.map((station) => (
              <a
                key={station}
                href={`#${station}`}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: `1px solid ${ui.panelBorder}`,
                  background: ui.panelBg,
                  color: ui.text,
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {STATION_LABELS[station]}
              </a>
            ))}
            <Link
              to={industrialRailHref('warehouse', slug)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: `1px solid ${ui.panelBorder}`,
                background: ui.panelBg,
                color: ui.link,
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              SUP
            </Link>
          </div>

          <div style={{ display: 'grid', gap: 20 }}>
            {ANCHOR_STATIONS.map((station) => {
              const stationOrders = byStation.get(station) ?? [];
              return (
                <section
                  key={station}
                  id={`station-${station}`}
                  style={{
                    border: `1px solid ${ui.panelBorder}`,
                    borderRadius: 10,
                    padding: 14,
                    background: ui.panelBg,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <h2 style={{ margin: 0, fontSize: 16, color: ui.textStrong }}>
                      {STATION_LABELS[station]}
                    </h2>
                    <Link
                      to={buildIndustrialStationPath(station, slug)}
                      style={{ fontSize: 13, color: ui.link }}
                    >
                      {'Abrir esta\u00e7\u00e3o \u2192'}
                    </Link>
                  </div>
                  {stationOrders.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: ui.muted }}>
                      {'Sem ordens nesta esta\u00e7\u00e3o.'}
                    </p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18, color: ui.text, fontSize: 13 }}>
                      {stationOrders.map((order) => (
                        <li key={order.id} style={{ marginBottom: 6 }}>
                          <Link
                            to={`/industrial/work-orders/order/${order.id}`}
                            style={{ color: ui.link }}
                          >
                            {order.id.slice(0, 8)}
                            {ELLIPSIS}
                          </Link>
                          {` ${DOT} `}
                          {order.status}
                          {` ${DOT} `}
                          {order.pieceIds.length}
                          {' pe\u00e7a(s)'}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </IndustrialLayout>
      </div>
    </div>
  );
}
