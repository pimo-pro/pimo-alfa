import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import {
  buildIndustrialStationPath,
  resolveProjectIdentity,
} from '@/core/projects/projectIdentity';
import { fetchWorkOrders } from '@/industrial/api/workOrderActions';
import { IndustrialLayout, useIndustrialPageState } from '@/industrial/ui/components';
import { industrialUi, useIndustrialTone } from '@/industrial/ui/layouts/industrialTheme';
import {
  INDUSTRIAL_STATIONS,
  STATION_LABELS,
  type IndustrialStation,
  type IndustrialWorkOrder,
} from '@/industrial/work-orders/types';
import { resolveOrderProjectCode } from '@/industrial/work-orders/resolveWorkOrderPiece';

const ANCHOR_STATIONS: IndustrialStation[] = [
  'nesting',
  'drill',
  'orlar',
  'montagem',
  'embalagem',
];

/**
 * Hub de ordens por projecto + anchors #nesting|#drill|ù
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
        setError('Projecto nùo encontrado.');
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

  return (
    <IndustrialLayout
      title={`Ordens ù ${title}`}
      description={
        loading
          ? 'A carregarù'
          : `${orders.length} ordem(ns) ù ${identity?.projectCode ?? 'ù'}`
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
              border: `1px solid ${ui.border}`,
              background: ui.surface,
              color: ui.text,
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {STATION_LABELS[station]}
          </a>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        {ANCHOR_STATIONS.map((station) => {
          const stationOrders = byStation.get(station) ?? [];
          return (
            <section
              key={station}
              id={`station-${station}`}
              style={{
                border: `1px solid ${ui.border}`,
                borderRadius: 10,
                padding: 14,
                background: ui.surface,
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
                  Abrir estaùùo ?
                </Link>
              </div>
              {stationOrders.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: ui.muted }}>Sem ordens nesta estaùùo.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, color: ui.text, fontSize: 13 }}>
                  {stationOrders.map((order) => (
                    <li key={order.id} style={{ marginBottom: 6 }}>
                      <Link to={`/industrial/work-orders/order/${order.id}`} style={{ color: ui.link }}>
                        {order.id.slice(0, 8)}ù
                      </Link>
                      {' ù '}
                      {order.status}
                      {' ù '}
                      {order.pieceIds.length} peùa(s)
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </IndustrialLayout>
  );
}
