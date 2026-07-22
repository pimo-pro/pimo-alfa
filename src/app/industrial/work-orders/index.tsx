import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/auth/useAuth';
import { generateProjectWorkOrders } from '@/industrial/api/workOrderActions';
import { resolveProjetosLinkForProjectId } from '@/industrial/integration/projetos/projetosProjectLinks';
import {
  projectCodeFromName,
  resolveOrderProjectCode,
  resolveProjectIdByProjectCode,
} from '@/industrial/work-orders/resolveWorkOrderPiece';
import { readOfflineProjects } from '@/core/projects/projectsOfflineStore';
import { IndustrialLayout, useIndustrialPageState } from '@/industrial/ui/components';
import { INDUSTRIAL_STATIONS, STATION_LABELS, type IndustrialStation } from '@/industrial/work-orders/types';
import { industrialFeatureFlags } from '@/industrial/config/featureFlags';
import { buildIndustrialOnlineAnalysisIndexPath } from '@/core/industrial/onlineAnalysis';

import QrScannerPanel from './components/QrScannerPanel';
import { useWorkOrders } from './hooks/useWorkOrders';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em execução',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

function normalizeProjectQueryParam(raw: string | null): string {
  if (!raw?.trim()) return '';
  const value = raw.trim();
  if (/^pimo/i.test(value)) {
    const project = readOfflineProjects().find((p) => !p.deleted && p.id === value);
    if (project) return projectCodeFromName(project.name?.trim() || 'Projeto');
  }
  return value;
}

export default function IndustrialWorkOrdersRoute() {
  useIndustrialPageState();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stationFilter, setStationFilter] = useState<IndustrialStation | ''>('');
  const [projectFilter, setProjectFilter] = useState(() =>
    normalizeProjectQueryParam(searchParams.get('project')),
  );

  useEffect(() => {
    const fromQuery = normalizeProjectQueryParam(searchParams.get('project'));
    if (fromQuery) setProjectFilter(fromQuery);
  }, [searchParams]);

  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      projectCode: projectFilter || undefined,
      station: stationFilter || undefined,
    }),
    [projectFilter, stationFilter],
  );

  const { orders, loading, error: loadError, reload } = useWorkOrders(filters);

  const projects = useMemo(
    () =>
      readOfflineProjects()
        .filter((p) => !p.deleted)
        .map((project) => ({
          id: project.id,
          name: project.name?.trim() || 'Projeto',
          projectCode: projectCodeFromName(project.name?.trim() || 'Projeto'),
        })),
    [],
  );

  const syncProjectQuery = (projectCode: string) => {
    setProjectFilter(projectCode);
    if (projectCode) {
      setSearchParams({ project: projectCode }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleGenerate = async () => {
    if (!projectFilter) {
      setError('Seleccione um projeto para gerar ordens.');
      return;
    }
    const projectId = resolveProjectIdByProjectCode(projectFilter);
    if (!projectId) {
      setError(`Projeto "${projectFilter}" não encontrado offline. Abra o projecto em PROJETOS primeiro.`);
      return;
    }
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const result = await generateProjectWorkOrders(projectId);
      setMessage(
        `Criadas ${result.orders.length} ordens para "${result.projectName}".` +
          (result.skippedStations.length
            ? ` Estações sem tarefas: ${result.skippedStations.map((s) => STATION_LABELS[s as IndustrialStation] ?? s).join(', ')}.`
            : ''),
      );
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar ordens.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <IndustrialLayout
      title="Ordens de Trabalho"
      description="Gestão e execução das work orders industriais por estação."
    >
      <div style={{ display: 'grid', gap: 20 }}>
        <QrScannerPanel />

        <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {INDUSTRIAL_STATIONS.map((station) => (
            <Link
              key={station}
              to={`/industrial/work-orders/${station}`}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                color: '#0f172a',
                textDecoration: 'none',
              }}
            >
              {STATION_LABELS[station]}
            </Link>
          ))}
        </section>

        <section
          style={{
            display: 'grid',
            gap: 12,
            padding: 16,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            background: '#fff',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 14 }}>Gerar ordens por projeto</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={projectFilter}
              onChange={(e) => syncProjectQuery(e.target.value)}
              style={{ minWidth: 220, padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="">Seleccionar projeto…</option>
              {projects.map((project) => (
                <option key={project.id} value={project.projectCode}>
                  {project.projectCode} · {project.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={generating || !projectFilter}
              onClick={() => void handleGenerate()}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: 'none',
                background: '#0f172a',
                color: '#fff',
                cursor: generating ? 'wait' : 'pointer',
              }}
            >
              {generating ? 'A gerar…' : 'Gerar ordens'}
            </button>
            {industrialFeatureFlags.industrialOnlineAnalysis && projectFilter
              ? (() => {
                  const selected = projects.find((p) => p.projectCode === projectFilter);
                  if (!selected) return null;
                  return (
                    <Link
                      to={buildIndustrialOnlineAnalysisIndexPath(selected.name)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        color: '#0f172a',
                        textDecoration: 'none',
                        fontSize: 13,
                      }}
                    >
                      Análise arquivo completo
                    </Link>
                  );
                })()
              : null}
            {user?.id ? (
              <span style={{ fontSize: 12, color: '#64748b' }}>Operador: {user.id}</span>
            ) : null}
          </div>
          {message ? <p style={{ margin: 0, color: '#16a34a', fontSize: 13 }}>{message}</p> : null}
          {error ? <p style={{ margin: 0, color: '#dc2626', fontSize: 13 }}>{error}</p> : null}
        </section>

        <section style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value as IndustrialStation | '')}
              style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="">Todas as estações</option>
              {INDUSTRIAL_STATIONS.map((station) => (
                <option key={station} value={station}>
                  {STATION_LABELS[station]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void reload()}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              Actualizar
            </button>
          </div>

          {projectFilter ? (
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              Filtro: <strong style={{ fontFamily: 'monospace' }}>{projectFilter}</strong>
            </p>
          ) : null}

          {loading ? <p style={{ color: '#64748b' }}>A carregar ordens…</p> : null}
          {loadError ? <p style={{ color: '#dc2626' }}>{loadError}</p> : null}

          {!loading && orders.length === 0 ? (
            <p style={{ color: '#64748b' }}>Nenhuma ordem encontrada.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: 8 }}>Projeto</th>
                  <th style={{ padding: 8 }}>Estação</th>
                  <th style={{ padding: 8 }}>Estado</th>
                  <th style={{ padding: 8 }}>Peças</th>
                  <th style={{ padding: 8 }}>Acções</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const projectCode = resolveOrderProjectCode(order);
                  const projetosLink = resolveProjetosLinkForProjectId(order.projectId);
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 8 }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{projectCode}</div>
                        {projetosLink ? (
                          <Link to={projetosLink.href} style={{ fontSize: 11, color: '#2563eb' }}>
                            Abrir PROJETOS
                          </Link>
                        ) : null}
                      </td>
                      <td style={{ padding: 8 }}>{STATION_LABELS[order.station]}</td>
                      <td style={{ padding: 8 }}>{STATUS_LABEL[order.status] ?? order.status}</td>
                      <td style={{ padding: 8 }}>{order.pieceIds.length}</td>
                      <td style={{ padding: 8 }}>
                        <Link to={`/industrial/work-orders/order/${order.id}`} style={{ color: '#2563eb' }}>
                          Executar
                        </Link>
                        {' · '}
                        <Link to={`/industrial/work-orders/${order.station}`} style={{ color: '#64748b' }}>
                          Estação
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </IndustrialLayout>
  );
}
