import { useMemo, type CSSProperties } from 'react';

import IndustrialSpriteIcon from '@/components/icons/IndustrialSpriteIcon';
import StationCanvas from '@/industrial/ui/components/StationCanvas';
import StationChatOverlay from '@/industrial/ui/components/StationChatOverlay';
import {
  industrialBtnStyle,
  industrialCanvasShellStyle,
  INDUSTRIAL_PANEL_MOTION_CLASS,
  ensureIndustrialInteractionStyles,
  industrialPanelDepthStyle,
  industrialSectionTitleStyle,
  industrialVisionActiveStyle,
  industrialListItemStyle,
} from '@/industrial/ui/layouts/industrialStyles';
import {
  INDUSTRIAL_STATIONS,
  STATION_LABELS,
  type IndustrialStation,
  type IndustrialWorkOrderTask,
} from '@/industrial/work-orders/types';
import { buildCanvasPieces } from '@/app/industrial/work-orders/utils/stationListData';

import type { UseSupervisorDashboardReturn } from '../hooks/useSupervisorDashboard';
import SupervisorInfoCards from './SupervisorInfoCards';
import SupervisorNotificationsOverlay from './SupervisorNotificationsOverlay';

// PIMO Industrial System — Finalization Layer
/**
 * Camada visual consolidada do supervisor (Fases Visuais 1–6 + Industriais 1–12).
 *
 * O que faz: mapa industrial completo no dashboard — WO engine, productivity,
 * cost heatmap, execution, real data, production, integration, runtime,
 * operations, performance e consolidation map/summary.
 *
 * Estados lidos: `filteredTasks`, `snapshot`, `selectedTask`, `stationStatuses`,
 * `alerts`, realtime — já expostos por useSupervisorDashboard (sem APIs novas).
 *
 * Fluxos: FLOW_STAGES + resolveFlowIndex; heatmaps/scores agregam tarefas no UI.
 *
 * Alertas: lista `woAlerts` derivada de estados existentes (dados, custo, execução,
 * produção, integração, runtime, operações, performance, consolidação).
 *
 * Timelines / resumos: estimativas STAGE_EST_MIN / STAGE_COST_EUR e contagens
 * por estação/operador/etapa — apenas representação visual.
 *
 * Garantia: não altera lógica do supervisor, rotas, handlers nem backend.
 */

interface SupervisorMainAreaProps {
  state: UseSupervisorDashboardReturn;
}

const MODES = [
  { id: 'canvas' as const, icon: 'industrial-canvas-3d' as const, label: '3D' },
  { id: 'chat' as const, icon: 'industrial-chat' as const, label: 'Chat' },
  { id: 'info' as const, icon: 'industrial-info' as const, label: 'Info' },
  { id: 'alerts' as const, icon: 'industrial-alerts' as const, label: 'Alertas' },
];

const FLOW_STAGES = [
  { id: 'nesting', short: 'NES', label: 'NESTING', color: '#38bdf8' },
  { id: 'cnc', short: 'CNC', label: 'CNC', color: '#818cf8' },
  { id: 'drill', short: 'DRI', label: 'DRILL', color: '#22d3ee' },
  { id: 'orlar', short: 'ORL', label: 'ORLAR', color: '#a3e635' },
  { id: 'montagem', short: 'MON', label: 'MONTAGEM', color: '#fbbf24' },
  { id: 'embalagem', short: 'EMB', label: 'EMBALAGEM', color: '#fb7185' },
] as const;

const EXEC_VISUAL: Record<
  IndustrialWorkOrderTask['status'],
  { id: 'waiting' | 'in-progress' | 'completed' | 'blocked'; label: string; color: string }
> = {
  pending: { id: 'waiting', label: 'waiting', color: '#f59e0b' },
  in_progress: { id: 'in-progress', label: 'in-progress', color: '#38bdf8' },
  completed: { id: 'completed', label: 'completed', color: '#16a34a' },
  rejected: { id: 'blocked', label: 'blocked', color: '#f87171' },
};

function chipStyle(active: boolean, color?: string): CSSProperties {
  return {
    padding: '4px 8px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    lineHeight: 1.5,
    border: `1px solid ${active ? color ?? 'rgba(59,130,246,0.55)' : 'var(--border, #334155)'}`,
    background: active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
    color: active ? '#f1f5f9' : '#a3b2c2',
    boxShadow: active ? `0 0 0 2px ${color ?? 'rgba(59,130,246,0.45)'}` : undefined,
    opacity: active ? 1 : 0.85,
    transition: 'all 140ms ease-out',
  };
}

function resolveFlowIndex(op: string): number {
  const o = op.toLowerCase();
  if (!o) return -1;
  if (o.includes('embal')) return 5;
  if (o.includes('montag')) return 4;
  if (o.includes('orlar') || o.includes('edge')) return 3;
  if (o.includes('drill') || o.includes('fur')) return 2;
  if (o.includes('cnc')) return 1;
  if (o.includes('nest')) return 0;
  return FLOW_STAGES.findIndex((s) => s.id === o);
}

function timelineState(
  op: string,
  status: IndustrialWorkOrderTask['status'] | undefined,
  stageIdx: number,
): 'pendente' | 'activo' | 'concluído' {
  const cur = resolveFlowIndex(op);
  if (cur < 0) return 'pendente';
  if (stageIdx < cur) return 'concluído';
  if (stageIdx > cur) return 'pendente';
  if (status === 'completed') return 'concluído';
  return 'activo';
}

function isVisuallyDelayed(task: IndustrialWorkOrderTask): boolean {
  const ref =
    task.status === 'in_progress' && task.startedAt
      ? task.startedAt
      : task.status === 'pending'
        ? task.createdAt
        : null;
  if (!ref) return false;
  const ageMs = Date.now() - new Date(ref).getTime();
  const limitMs = task.status === 'in_progress' ? 4 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return Number.isFinite(ageMs) && ageMs > limitMs;
}

/** Estimativas visuais apenas (sem APIs). */
const STAGE_EST_MIN = [12, 18, 15, 10, 25, 8] as const;
const TOTAL_EST_MIN = STAGE_EST_MIN.reduce((a, b) => a + b, 0);

function formatEstMin(min: number): string {
  if (!Number.isFinite(min) || min < 0) return '—';
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}

function visualElapsedMin(task: IndustrialWorkOrderTask | null): number | null {
  if (!task) return null;
  if (task.status === 'completed' && task.startedAt && task.completedAt) {
    const ms = new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime();
    return Number.isFinite(ms) && ms >= 0 ? ms / 60000 : null;
  }
  const ref = task.status === 'in_progress' && task.startedAt ? task.startedAt : task.createdAt;
  if (!ref) return null;
  const ms = Date.now() - new Date(ref).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms / 60000 : null;
}

type HeatTone = 'rápida' | 'normal' | 'lenta' | 'bloqueada';

function heatColor(tone: HeatTone): string {
  if (tone === 'rápida') return '#38bdf8';
  if (tone === 'lenta') return '#f97316';
  if (tone === 'bloqueada') return '#ef4444';
  return '#a3e635';
}

function stationHeatTone(
  load: number,
  rejected: number,
  delayed: number,
  online: boolean | undefined,
): HeatTone {
  if (rejected > 0 || online === false) return 'bloqueada';
  if (delayed > 0 || load >= 6) return 'lenta';
  if (load > 0 && load <= 2 && delayed === 0) return 'rápida';
  if (load === 0) return 'normal';
  return 'normal';
}

/** Custos visuais apenas (sem APIs). */
const STAGE_COST_EUR = [18, 32, 24, 14, 40, 12] as const;
const TOTAL_COST_EUR = STAGE_COST_EUR.reduce((a, b) => a + b, 0);

function formatEur(n: number): string {
  if (!Number.isFinite(n)) return '€—';
  return `€${Math.round(n)}`;
}

function costHeatColor(cost: number): string {
  if (cost >= 32) return '#f97316';
  if (cost >= 20) return '#fbbf24';
  return '#38bdf8';
}

function visualCostActual(stageCost: number, elapsed: number | null, stageEst: number): number {
  if (elapsed == null || stageEst <= 0) return stageCost;
  return Math.round(stageCost * (elapsed / stageEst));
}

export default function SupervisorMainArea({ state }: SupervisorMainAreaProps) {
  const tasks = state.filteredTasks;
  const orders = state.snapshot?.orders ?? [];

  const canvasPieces = useMemo(() => {
    const base = buildCanvasPieces(tasks, orders, state.selectedTask?.pieceId ?? null);
    return base.map((piece) => {
      const syncPiece = state.lastThreeSync?.pieceId === piece.id ? state.lastThreeSync : null;
      const syncColor =
        syncPiece?.action === 'completed'
          ? '#16a34a'
          : syncPiece?.action === 'rejected'
            ? '#dc2626'
            : syncPiece?.action === 'rework'
              ? '#f59e0b'
              : undefined;
      return {
        ...piece,
        color: syncColor ?? (state.selectedTask?.pieceId === piece.id ? '#38bdf8' : piece.color),
        highlighted: state.selectedTask?.pieceId === piece.id,
      };
    });
  }, [tasks, orders, state.selectedTask?.pieceId, state.lastThreeSync, state.canvasRevision]);

  const conversations = useMemo(
    () => [
      {
        id: 'supervisor',
        title: 'Supervisor',
        messages: [
          {
            id: 'sys',
            author: 'Sistema',
            body: 'Dashboard supervisor activo. Seleccione uma estação ou projeto para detalhe.',
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'floor',
        title: 'Chão de fábrica',
        messages: [] as Array<{ id: string; author: string; body: string; createdAt: string }>,
      },
    ],
    [],
  );

  const liveConversations = useMemo(
    () => state.mergeChatConversations(conversations),
    [conversations, state],
  );

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').slice(0, 6),
    [tasks],
  );

  const stationLoad = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const station of INDUSTRIAL_STATIONS) counts[station] = 0;
    for (const task of tasks) {
      const key = task.operationType;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [tasks]);

  const dataVisual = state.snapshot ? 'dados carregados' : 'dados pendentes';
  const qrVisual = state.selectedTask ? 'válido' : 'pendente';
  const selected = state.selectedTask;
  const op = (selected?.operationType ?? '').toLowerCase();
  const flowIdx = resolveFlowIndex(op);
  const currentStage = flowIdx >= 0 ? FLOW_STAGES[flowIdx] : null;
  const execVisual = selected ? EXEC_VISUAL[selected.status] : null;
  const showErro = state.alerts.some((a) => a.level === 'error');

  const woSummary = useMemo(() => {
    const pieceIds = new Set(tasks.map((t) => t.pieceId));
    return {
      total: pieceIds.size,
      activas: tasks.filter((t) => t.status === 'in_progress').length,
      concluidas: tasks.filter((t) => t.status === 'completed').length,
      bloqueadas: tasks.filter((t) => t.status === 'rejected').length,
      pendentes: tasks.filter((t) => t.status === 'pending').length,
    };
  }, [tasks]);

  const productivity = useMemo(() => {
    const byStation: Array<{
      id: string;
      short: string;
      label: string;
      load: number;
      rejected: number;
      delayed: number;
      tone: HeatTone;
      prod: string;
    }> = FLOW_STAGES.map((stage, idx) => {
      const stationKey = stage.id === 'cnc' ? 'nesting' : stage.id;
      const matched = tasks.filter((t) => resolveFlowIndex(t.operationType) === idx);
      const load = matched.length;
      const rejected = matched.filter((t) => t.status === 'rejected').length;
      const delayed = matched.filter((t) => isVisuallyDelayed(t)).length;
      const online = state.stationStatuses?.[stationKey as IndustrialStation];
      const tone = stationHeatTone(load, rejected, delayed, online);
      const prod = tone === 'rápida' ? 'alta' : tone === 'lenta' ? 'baixa' : tone === 'bloqueada' ? 'crítica' : 'média';
      return { id: stage.id, short: stage.short, label: stage.label, load, rejected, delayed, tone, prod };
    });

    const operators = new Map<string, { done: number; active: number; rejected: number }>();
    for (const t of tasks) {
      const key = t.operatorId?.trim() || 'sem-operador';
      const row = operators.get(key) ?? { done: 0, active: 0, rejected: 0 };
      if (t.status === 'completed') row.done += 1;
      else if (t.status === 'rejected') row.rejected += 1;
      else row.active += 1;
      operators.set(key, row);
    }
    const byOperator = Array.from(operators.entries())
      .slice(0, 6)
      .map(([id, row]) => {
        const score = Math.min(
          99,
          Math.max(0, Math.round(row.done * 18 + row.active * 8 - row.rejected * 20)),
        );
        const prod = score >= 70 ? 'alta' : score >= 40 ? 'média' : row.rejected > 0 ? 'crítica' : 'baixa';
        return { id, ...row, score, prod };
      });

    const total = woSummary.total || 1;
    const geralScore = Math.min(
      99,
      Math.max(
        0,
        Math.round(
          (woSummary.concluidas / total) * 70 +
            (woSummary.activas / total) * 20 -
            (woSummary.bloqueadas / total) * 35 +
            25,
        ),
      ),
    );
    const geral =
      geralScore >= 70 ? 'alta' : geralScore >= 40 ? 'média' : woSummary.bloqueadas > 0 ? 'crítica' : 'baixa';

    return { byStation, byOperator, geral, geralScore };
  }, [tasks, state.stationStatuses, woSummary]);

  const stageEstMin = flowIdx >= 0 ? STAGE_EST_MIN[flowIdx] : STAGE_EST_MIN[0];
  const elapsedMin = visualElapsedMin(selected);
  const currentHeat = productivity.byStation.find((s) => s.id === (currentStage?.id ?? '')) ?? null;
  const stationSpeed = currentHeat?.tone ?? 'normal';
  const operatorProdVisual =
    selected?.operatorId
      ? productivity.byOperator.find((o) => o.id === selected.operatorId)?.prod ?? 'média'
      : productivity.byOperator[0]?.prod ?? '—';
  const stationProdVisual = currentHeat?.prod ?? 'média';

  const stageCost = flowIdx >= 0 ? STAGE_COST_EUR[flowIdx] : STAGE_COST_EUR[0];
  const costActual = visualCostActual(stageCost, elapsedMin, stageEstMin);
  const nextStage = flowIdx >= 0 && flowIdx < FLOW_STAGES.length - 1 ? FLOW_STAGES[flowIdx + 1] : null;
  const prevDoneLabel =
    flowIdx > 0 ? FLOW_STAGES[flowIdx - 1]?.label : selected?.status === 'completed' ? currentStage?.label : null;

  const costSummary = useMemo(() => {
    const byStage = FLOW_STAGES.map((stage, idx) => {
      const load = tasks.filter((t) => resolveFlowIndex(t.operationType) === idx).length || 1;
      const unit = STAGE_COST_EUR[idx];
      const total = unit * Math.max(1, Math.min(load, 12));
      return {
        id: stage.id,
        short: stage.short,
        label: stage.label,
        unit,
        total,
        tone: unit >= 32 ? 'cara' : unit <= 14 ? 'barata' : 'média',
      };
    });
    const byOperator = productivity.byOperator.map((op) => ({
      id: op.id,
      total: Math.round((op.done * 22 + op.active * 16 + op.rejected * 8) || 12),
      prod: op.prod,
    }));
    const total = byStage.reduce((s, r) => s + r.total, 0);
    return { byStage, byOperator, total };
  }, [tasks, productivity.byOperator]);

  const execSummary = useMemo(() => {
    const byStation = productivity.byStation.map((row) => ({
      id: row.id,
      short: row.short,
      label: row.tone === 'rápida' ? 'rápida' : row.tone === 'lenta' ? 'lenta' : row.tone === 'bloqueada' ? 'bloqueada' : 'normal',
    }));
    const byOperator = productivity.byOperator.map((op) => ({
      id: op.id,
      label: op.prod === 'alta' ? 'rápida' : op.prod === 'baixa' || op.prod === 'crítica' ? 'lenta' : 'normal',
    }));
    const geral =
      woSummary.bloqueadas > 0
        ? 'bloqueada'
        : stationSpeed === 'lenta'
          ? 'lenta'
          : stationSpeed === 'rápida'
            ? 'rápida'
            : 'normal';
    return { byStation, byOperator, geral };
  }, [productivity.byStation, productivity.byOperator, woSummary.bloqueadas, stationSpeed]);

  const woAlerts: string[] = [];
  if (!selected) woAlerts.push('peça sem QR');
  if (selected?.status === 'rejected') woAlerts.push('peça bloqueada');
  if (selected && flowIdx < 0) woAlerts.push('peça sem etapa definida');
  if (!state.snapshot) woAlerts.push('peça sem dados');
  if (selected && isVisuallyDelayed(selected)) woAlerts.push('peça atrasada');
  if (stationSpeed === 'lenta') woAlerts.push('estação lenta');
  if (operatorProdVisual === 'baixa') woAlerts.push('operador lento');
  if (elapsedMin != null && elapsedMin > stageEstMin * 1.15) woAlerts.push('peça acima do tempo estimado');
  if (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && selected?.status !== 'pending') {
    woAlerts.push('peça abaixo do tempo estimado');
  }
  if (costActual > stageCost * 1.15) woAlerts.push('custo acima do estimado');
  if (costActual < stageCost * 0.75 && elapsedMin != null) woAlerts.push('custo abaixo do estimado');
  if (selected?.status === 'rejected' || (selected && flowIdx < 0)) woAlerts.push('custo inconsistente');
  if (stationSpeed === 'lenta' || (elapsedMin != null && elapsedMin > stageEstMin * 1.35)) woAlerts.push('execução lenta');
  if (stationSpeed === 'rápida' || (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && selected?.status === 'completed')) {
    woAlerts.push('execução rápida');
  }
  if (selected?.status === 'rejected') woAlerts.push('execução bloqueada');
  if (selected && flowIdx < 0) woAlerts.push('execução inconsistente');

  const realDataState: 'carregados' | 'pendentes' | 'incompletos' | 'inconsistentes' = showErro
    ? 'inconsistentes'
    : selected && flowIdx < 0
      ? 'inconsistentes'
      : selected && !selected.operationType
        ? 'incompletos'
        : state.snapshot
          ? 'carregados'
          : 'pendentes';

  const productionFlow: 'activa' | 'pendente' | 'concluída' | 'bloqueada' =
    selected?.status === 'rejected'
      ? 'bloqueada'
      : selected?.status === 'completed'
        ? 'concluída'
        : selected?.status === 'in_progress'
          ? 'activa'
          : woSummary.activas > 0
            ? 'activa'
            : woSummary.bloqueadas > 0
              ? 'bloqueada'
              : woSummary.concluidas > 0 && woSummary.pendentes === 0
                ? 'concluída'
                : 'pendente';

  const realDataSummary = useMemo(() => {
    const total = tasks.length;
    let valid = 0;
    let pendentes = 0;
    let inconsistentes = 0;
    for (const t of tasks) {
      const idx = resolveFlowIndex(t.operationType);
      if (t.status === 'rejected' || idx < 0) inconsistentes += 1;
      else if (t.status === 'pending') pendentes += 1;
      else valid += 1;
    }
    if (!state.snapshot) pendentes = Math.max(pendentes, 1);
    return { total, valid, pendentes, inconsistentes };
  }, [tasks, state.snapshot]);

  const productionSummary = useMemo(() => {
    const byStation = productivity.byStation.map((row) => ({
      id: row.id,
      short: row.short,
      label:
        row.tone === 'bloqueada'
          ? 'bloqueada'
          : row.tone === 'lenta'
            ? 'lenta'
            : row.load > 0
              ? 'activa'
              : 'pendente',
    }));
    const byOperator = productivity.byOperator.map((op) => ({
      id: op.id,
      label:
        op.rejected > 0
          ? 'bloqueada'
          : op.active > 0
            ? 'activa'
            : op.done > 0
              ? 'concluída'
              : 'pendente',
    }));
    return {
      geral: productionFlow,
      byStation,
      byOperator,
    };
  }, [productivity.byStation, productivity.byOperator, productionFlow]);

  if (realDataState === 'pendentes' || !state.snapshot) woAlerts.push('dados ausentes');
  if (realDataState === 'incompletos') woAlerts.push('dados incompletos');
  if (realDataState === 'inconsistentes') woAlerts.push('dados inconsistentes');
  if (stationSpeed === 'lenta' || (productionFlow === 'activa' && elapsedMin != null && elapsedMin > stageEstMin * 1.35)) {
    woAlerts.push('produção lenta');
  }
  if (stationSpeed === 'rápida' || (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && productionFlow === 'concluída')) {
    woAlerts.push('produção rápida');
  }
  if (productionFlow === 'bloqueada') woAlerts.push('produção bloqueada');
  if (selected && flowIdx < 0) woAlerts.push('produção inconsistente');

  const integrationState: 'activa' | 'pendente' | 'incompleta' | 'inconsistente' = showErro
    ? 'inconsistente'
    : selected && flowIdx < 0
      ? 'inconsistente'
      : selected && (!currentStage || !selected.operatorId)
        ? 'incompleta'
        : selected && currentStage
          ? 'activa'
          : state.snapshot
            ? 'pendente'
            : 'pendente';

  const runtimeFlow: 'activo' | 'pendente' | 'concluído' | 'bloqueado' =
    selected?.status === 'rejected'
      ? 'bloqueado'
      : selected?.status === 'completed'
        ? 'concluído'
        : selected?.status === 'in_progress'
          ? 'activo'
          : woSummary.activas > 0
            ? 'activo'
            : woSummary.bloqueadas > 0
              ? 'bloqueado'
              : woSummary.concluidas > 0 && woSummary.pendentes === 0
                ? 'concluído'
                : 'pendente';

  const integrationSummary = useMemo(() => {
    const byStation = productivity.byStation.map((row) => ({
      id: row.id,
      short: row.short,
      label:
        row.tone === 'bloqueada'
          ? 'bloqueada'
          : row.load > 0
            ? 'activa'
            : 'pendente',
    }));
    const byOperator = productivity.byOperator.map((op) => ({
      id: op.id,
      label:
        op.rejected > 0
          ? 'bloqueada'
          : op.active > 0
            ? 'activa'
            : op.done > 0
              ? 'completa'
              : 'pendente',
    }));
    return { geral: integrationState, byStation, byOperator };
  }, [productivity.byStation, productivity.byOperator, integrationState]);

  const runtimeSummary = useMemo(() => {
    const byStation = productivity.byStation.map((row) => ({
      id: row.id,
      short: row.short,
      label:
        row.tone === 'bloqueada'
          ? 'bloqueado'
          : row.tone === 'lenta'
            ? 'lento'
            : row.load > 0
              ? 'activo'
              : 'pendente',
    }));
    const byOperator = productivity.byOperator.map((op) => ({
      id: op.id,
      label:
        op.rejected > 0
          ? 'bloqueado'
          : op.active > 0
            ? 'activo'
            : op.done > 0
              ? 'concluído'
              : 'pendente',
    }));
    return { geral: runtimeFlow, byStation, byOperator };
  }, [productivity.byStation, productivity.byOperator, runtimeFlow]);

  if (stationSpeed === 'lenta' || (integrationState === 'activa' && elapsedMin != null && elapsedMin > stageEstMin * 1.35)) {
    woAlerts.push('integração lenta');
  }
  if (stationSpeed === 'rápida' || (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && integrationState === 'activa')) {
    woAlerts.push('integração rápida');
  }
  if (selected?.status === 'rejected') woAlerts.push('integração bloqueada');
  if (integrationState === 'inconsistente') woAlerts.push('integração inconsistente');
  if (stationSpeed === 'lenta' || (runtimeFlow === 'activo' && elapsedMin != null && elapsedMin > stageEstMin * 1.35)) {
    woAlerts.push('runtime lento');
  }
  if (stationSpeed === 'rápida' || (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && runtimeFlow === 'concluído')) {
    woAlerts.push('runtime rápido');
  }
  if (runtimeFlow === 'bloqueado') woAlerts.push('runtime bloqueado');
  if (selected && flowIdx < 0) woAlerts.push('runtime inconsistente');

  const operationsFlow: 'activa' | 'pendente' | 'concluída' | 'bloqueada' =
    selected?.status === 'rejected'
      ? 'bloqueada'
      : selected?.status === 'completed'
        ? 'concluída'
        : selected?.status === 'in_progress'
          ? 'activa'
          : woSummary.activas > 0
            ? 'activa'
            : woSummary.bloqueadas > 0
              ? 'bloqueada'
              : woSummary.concluidas > 0 && woSummary.pendentes === 0
                ? 'concluída'
                : 'pendente';

  const operationsSummary = useMemo(() => {
    const byStation = productivity.byStation.map((row) => ({
      id: row.id,
      short: row.short,
      label:
        row.tone === 'bloqueada'
          ? 'bloqueada'
          : row.load > 0
            ? 'activa'
            : 'pendente',
    }));
    const byOperator = productivity.byOperator.map((op) => ({
      id: op.id,
      label:
        op.rejected > 0
          ? 'bloqueada'
          : op.active > 0
            ? 'activa'
            : op.done > 0
              ? 'concluída'
              : 'pendente',
    }));
    return { geral: operationsFlow, byStation, byOperator };
  }, [productivity.byStation, productivity.byOperator, operationsFlow]);

  const performanceEngine = useMemo(() => {
    const byStation = productivity.byStation.map((row) => {
      const score =
        row.tone === 'rápida' ? 88 : row.tone === 'bloqueada' ? 18 : row.tone === 'lenta' ? 42 : 65;
      const eficiente = score >= 70;
      return {
        id: row.id,
        short: row.short,
        score,
        eficiente,
        label: eficiente ? 'eficiente' : score < 40 ? 'ineficiente' : 'média',
      };
    });
    const byOperator = productivity.byOperator.map((op) => ({
      id: op.id,
      score: op.score,
      label: op.score >= 70 ? 'alta' : op.score >= 40 ? 'média' : 'baixa',
    }));
    const geralScore = Math.min(
      99,
      Math.max(0, Math.round(productivity.geralScore * 0.7 + (100 - Math.min(40, woSummary.bloqueadas * 12)))),
    );
    const estabilidade =
      woSummary.bloqueadas > 0 || showErro ? 'baixa' : stationSpeed === 'lenta' ? 'média' : 'alta';
    const qualidade =
      state.snapshot && realDataState === 'carregados' ? 'alta' : realDataState === 'inconsistentes' ? 'baixa' : 'média';
    return {
      geralScore,
      estabilidade,
      qualidade,
      velocidade: stationSpeed,
      byStation,
      byOperator,
    };
  }, [
    productivity.byStation,
    productivity.byOperator,
    productivity.geralScore,
    woSummary.bloqueadas,
    showErro,
    stationSpeed,
    state.snapshot,
    realDataState,
  ]);

  const consolidation = useMemo(
    () => ({
      engines: [
        { id: 'wo', label: 'Work Orders', ok: woSummary.total >= 0 },
        { id: 'prod', label: 'Productivity', ok: productivity.geralScore >= 0 },
        { id: 'cost', label: 'Cost', ok: costSummary.total >= 0 },
        { id: 'exec', label: 'Execution', ok: Boolean(execSummary.geral) },
        { id: 'data', label: 'Real Data', ok: realDataState === 'carregados' || Boolean(state.snapshot) },
        { id: 'fullprod', label: 'Production', ok: Boolean(productionFlow) },
        { id: 'integ', label: 'Integration', ok: integrationState !== 'inconsistente' },
        { id: 'runtime', label: 'Runtime', ok: runtimeFlow !== 'bloqueado' },
        { id: 'ops', label: 'Operations', ok: operationsFlow !== 'bloqueada' },
        { id: 'perf', label: 'Performance', ok: performanceEngine.geralScore >= 40 },
      ],
      runtimeView: `${runtimeFlow} · ${integrationState} · ${productionFlow} · ${realDataState}`,
      finalOk:
        !showErro &&
        runtimeFlow !== 'bloqueado' &&
        integrationState !== 'inconsistente' &&
        realDataState !== 'inconsistentes',
    }),
    [
      woSummary.total,
      productivity.geralScore,
      costSummary.total,
      execSummary.geral,
      realDataState,
      state.snapshot,
      productionFlow,
      integrationState,
      runtimeFlow,
      operationsFlow,
      performanceEngine.geralScore,
      showErro,
    ],
  );

  if (stationSpeed === 'lenta' || (operationsFlow === 'activa' && elapsedMin != null && elapsedMin > stageEstMin * 1.35)) {
    woAlerts.push('operação lenta');
  }
  if (stationSpeed === 'rápida' || (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && operationsFlow === 'concluída')) {
    woAlerts.push('operação rápida');
  }
  if (operationsFlow === 'bloqueada') woAlerts.push('operação bloqueada');
  if (selected && flowIdx < 0) woAlerts.push('operação inconsistente');
  if (performanceEngine.geralScore < 40) woAlerts.push('performance baixa');
  else if (performanceEngine.geralScore >= 75) woAlerts.push('performance alta');
  if (performanceEngine.estabilidade === 'baixa') woAlerts.push('performance instável');
  if (!consolidation.finalOk) woAlerts.push('consistência final em risco');
  else woAlerts.push('consistência final ok');
  if (performanceEngine.estabilidade === 'alta' && consolidation.finalOk) woAlerts.push('estabilidade final ok');
  else woAlerts.push('estabilidade final instável');
  if (showErro) woAlerts.push('erro');

  ensureIndustrialInteractionStyles();

  return (
    <div
      className={INDUSTRIAL_PANEL_MOTION_CLASS}
      style={{
        position: 'relative',
        minHeight: 0,
        color: '#f1f5f9',
        lineHeight: 1.5,
        ...industrialPanelDepthStyle,
        borderRadius: 8,
        padding: 8,
        transition: 'all 140ms ease-out',
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: 8,
          marginBottom: 12,
          ...industrialVisionActiveStyle,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={industrialSectionTitleStyle}>Work Orders Engine</span>
          <span style={chipStyle(dataVisual === 'dados carregados', '#16a34a')}>{dataVisual}</span>
          <span style={chipStyle(qrVisual === 'válido', qrVisual === 'válido' ? '#16a34a' : '#f59e0b')}>
            QR {qrVisual}
          </span>
          {state.realtimeConnected ? <span style={chipStyle(true, '#38bdf8')}>RTO live</span> : null}
        </div>

        <div style={{ display: 'grid', gap: 4 }}>
          <div style={industrialSectionTitleStyle}>Resumo industrial</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={chipStyle(true)} title="Total peças">total {woSummary.total}</span>
            <span style={chipStyle(woSummary.activas > 0, '#38bdf8')}>activas {woSummary.activas}</span>
            <span style={chipStyle(woSummary.concluidas > 0, '#16a34a')}>concluídas {woSummary.concluidas}</span>
            <span style={chipStyle(woSummary.bloqueadas > 0, '#f87171')}>bloqueadas {woSummary.bloqueadas}</span>
            <span style={chipStyle(woSummary.pendentes > 0, '#f59e0b')}>pendentes {woSummary.pendentes}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(
            [
              { id: 'waiting', label: 'waiting', color: '#f59e0b' },
              { id: 'in-progress', label: 'in-progress', color: '#38bdf8' },
              { id: 'completed', label: 'completed', color: '#16a34a' },
              { id: 'blocked', label: 'blocked', color: '#f87171' },
              { id: 'erro', label: 'erro', color: '#ef4444' },
            ] as const
          ).map((stage) => (
            <span
              key={stage.id}
              style={chipStyle(stage.id === 'erro' ? showErro : execVisual?.id === stage.id, stage.color)}
            >
              {stage.label}
            </span>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <div style={industrialSectionTitleStyle}>Work Order Timeline</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {FLOW_STAGES.map((stage, stageIdx) => {
              const stationKey = stage.id === 'cnc' ? 'nesting' : stage.id;
              const online = state.stationStatuses?.[stationKey as IndustrialStation];
              const count = stationLoad[stationKey] ?? 0;
              const stateLabel = selected
                ? timelineState(op, selected.status, stageIdx)
                : count > 0 || online === true
                  ? 'activo'
                  : 'pendente';
              const active = stateLabel === 'activo';
              const done = stateLabel === 'concluído';
              return (
                <span
                  key={stage.id}
                  title={`${stage.label} · ${stateLabel}${count > 0 ? ` · ${count}` : ''}${
                    online === undefined ? '' : online ? ' · online' : ' · offline'
                  }`}
                  style={{
                    ...chipStyle(active || done, done ? '#16a34a' : stage.color),
                    minWidth: 44,
                    textAlign: 'center',
                    opacity: stateLabel === 'pendente' ? 0.55 : 1,
                  }}
                >
                  {stage.short}
                  <div style={{ fontSize: 9, fontWeight: 500 }}>{stateLabel}</div>
                </span>
              );
            })}
          </div>
          {currentStage ? (
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>
              Estação responsável: <strong style={{ color: '#f1f5f9' }}>{currentStage.label}</strong>
              {selected ? ` · peça ${selected.pieceId}` : ''}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#a3b2c2' }}>Sem etapa definida para a peça seleccionada.</div>
          )}
        </div>

        {woAlerts.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {woAlerts.map((alert) => (
              <span key={alert} style={chipStyle(true, '#f87171')}>
                {alert}
              </span>
            ))}
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={industrialSectionTitleStyle}>Productivity Engine</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={chipStyle(true)}>tempo peça {formatEstMin(TOTAL_EST_MIN)}</span>
            <span style={chipStyle(true, currentStage?.color)}>
              tempo etapa {formatEstMin(stageEstMin)}
              {elapsedMin != null ? ` · decorrido ${formatEstMin(elapsedMin)}` : ''}
            </span>
            <span style={chipStyle(true, heatColor(stationSpeed))}>velocidade {stationSpeed}</span>
            <span style={chipStyle(true)}>prod. operador {operatorProdVisual}</span>
            <span style={chipStyle(true)}>prod. estação {stationProdVisual}</span>
            <span
              style={chipStyle(
                true,
                productivity.geralScore >= 70 ? '#16a34a' : productivity.geralScore >= 40 ? '#f59e0b' : '#f87171',
              )}
            >
              produtividade geral {productivity.geral} · {productivity.geralScore}
            </span>
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Productivity Heatmap</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {productivity.byStation.map((row) => (
                <span
                  key={row.id}
                  title={`${row.label}: ${row.tone} · carga ${row.load} · rej ${row.rejected}`}
                  style={{
                    ...chipStyle(true, heatColor(row.tone)),
                    minWidth: 52,
                    textAlign: 'center',
                    background:
                      row.tone === 'lenta'
                        ? 'rgba(249,115,22,0.18)'
                        : row.tone === 'bloqueada'
                          ? 'rgba(239,68,68,0.2)'
                          : row.tone === 'rápida'
                            ? 'rgba(56,189,248,0.16)'
                            : 'rgba(163,230,53,0.12)',
                  }}
                >
                  {row.short}
                  <div style={{ fontSize: 9, fontWeight: 500 }}>{row.tone}</div>
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Productivity Timeline</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FLOW_STAGES.map((stage, stageIdx) => (
                <span
                  key={stage.id}
                  title={`${stage.label} · est. ${STAGE_EST_MIN[stageIdx]} min`}
                  style={{
                    ...chipStyle(stageIdx === flowIdx, stage.color),
                    minWidth: 48,
                    textAlign: 'center',
                    opacity: stageIdx === flowIdx ? 1 : 0.7,
                  }}
                >
                  {stage.short}
                  <div style={{ fontSize: 9, fontWeight: 500 }}>{STAGE_EST_MIN[stageIdx]}m</div>
                </span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>
              Tempo total estimado: <strong style={{ color: '#f1f5f9' }}>{formatEstMin(TOTAL_EST_MIN)}</strong>
              {currentStage ? ` · etapa ${currentStage.label} (${formatEstMin(stageEstMin)})` : ''}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Productivity Summary</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {productivity.byStation.map((row) => (
                <span key={`prod-st-${row.id}`} style={chipStyle(true, heatColor(row.tone))}>
                  {row.short} {row.prod}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {productivity.byOperator.length === 0 ? (
                <span style={chipStyle(false)}>prod. operador —</span>
              ) : (
                productivity.byOperator.map((row) => (
                  <span key={`prod-op-${row.id}`} style={chipStyle(true)} title={`score visual ${row.score}`}>
                    op {row.id === 'sem-operador' ? 'n/d' : row.id.slice(0, 8)} · {row.prod}
                  </span>
                ))
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {productivity.byStation.map((row) => (
                <span key={`prod-et-${row.id}`} style={chipStyle(false, heatColor(row.tone))}>
                  etapa {row.short} · {row.prod}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={industrialSectionTitleStyle}>Cost Engine</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={chipStyle(true)}>custo total {formatEur(costSummary.total)}</span>
            <span style={chipStyle(true)} title="Base visual por peça">custo base peça {formatEur(TOTAL_COST_EUR)}</span>
            <span style={chipStyle(true, currentStage?.color)}>
              custo etapa {formatEur(stageCost)}
              {elapsedMin != null ? ` · visual ${formatEur(costActual)}` : ''}
            </span>
            <span style={chipStyle(true)}>
              custo estação {formatEur(costSummary.byStage.find((s) => s.id === currentStage?.id)?.total ?? stageCost)}
            </span>
            <span style={chipStyle(true)}>
              custo operador{' '}
              {formatEur(
                selected?.operatorId
                  ? costSummary.byOperator.find((o) => o.id === selected.operatorId)?.total ?? Math.round(stageCost * 0.9)
                  : costSummary.byOperator[0]?.total ?? Math.round(stageCost * 0.85),
              )}
            </span>
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Cost Heatmap</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {costSummary.byStage.map((row) => (
                <span
                  key={`cost-heat-${row.id}`}
                  title={`${row.label}: ${row.tone} · ${formatEur(row.unit)}`}
                  style={{
                    ...chipStyle(true, costHeatColor(row.unit)),
                    minWidth: 52,
                    textAlign: 'center',
                    background:
                      row.tone === 'cara'
                        ? 'rgba(249,115,22,0.18)'
                        : row.tone === 'barata'
                          ? 'rgba(56,189,248,0.16)'
                          : 'rgba(251,191,36,0.14)',
                  }}
                >
                  {row.short}
                  <div style={{ fontSize: 9, fontWeight: 500 }}>{row.tone}</div>
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Cost Summary</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={chipStyle(true)}>total {formatEur(costSummary.total)}</span>
              {costSummary.byStage.map((row) => (
                <span key={`cost-sum-et-${row.id}`} style={chipStyle(true, costHeatColor(row.unit))}>
                  {row.short} {formatEur(row.total)}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {costSummary.byStage.map((row) => (
                <span key={`cost-sum-st-${row.id}`} style={chipStyle(false, costHeatColor(row.unit))}>
                  estação {row.short} · {formatEur(row.total)}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {costSummary.byOperator.length === 0 ? (
                <span style={chipStyle(false)}>operador —</span>
              ) : (
                costSummary.byOperator.map((row) => (
                  <span key={`cost-sum-op-${row.id}`} style={chipStyle(true)}>
                    op {row.id === 'sem-operador' ? 'n/d' : row.id.slice(0, 8)} · {formatEur(row.total)}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={industrialSectionTitleStyle}>Real Execution Engine</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={chipStyle(Boolean(currentStage), currentStage?.color)}>
              etapa actual {currentStage?.short ?? '—'}
            </span>
            <span style={chipStyle(Boolean(nextStage), nextStage?.color)}>
              etapa seguinte {nextStage?.short ?? '—'}
            </span>
            <span style={chipStyle(Boolean(prevDoneLabel), '#16a34a')}>
              etapa concluída {prevDoneLabel ?? (selected?.status === 'completed' ? currentStage?.short : '—')}
            </span>
            <span style={chipStyle(true)}>execução geral {execSummary.geral}</span>
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Execution Timeline</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a3b2c2' }}>
              <span>tempo real estimado {formatEstMin(stageEstMin)}</span>
              <span>decorrido {elapsedMin != null ? formatEstMin(elapsedMin) : '—'}</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border, #334155)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.round(((elapsedMin ?? 0) / Math.max(1, stageEstMin)) * 100))}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, rgba(251,113,133,0.85), rgba(249,115,22,0.95))',
                  transition: 'width 140ms ease-out',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Execution Summary</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {execSummary.byStation.map((row) => (
                <span
                  key={`exec-st-${row.id}`}
                  style={chipStyle(
                    true,
                    row.label === 'rápida' ? '#38bdf8' : row.label === 'lenta' ? '#f97316' : row.label === 'bloqueada' ? '#ef4444' : '#a3e635',
                  )}
                >
                  {row.short} {row.label}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {execSummary.byOperator.length === 0 ? (
                <span style={chipStyle(false)}>operador —</span>
              ) : (
                execSummary.byOperator.map((row) => (
                  <span key={`exec-op-${row.id}`} style={chipStyle(true)}>
                    op {row.id === 'sem-operador' ? 'n/d' : row.id.slice(0, 8)} · {row.label}
                  </span>
                ))
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {execSummary.byStation.map((row) => (
                <span key={`exec-et-${row.id}`} style={chipStyle(false)}>
                  etapa {row.short} · {row.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={industrialSectionTitleStyle}>Real Data Engine</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(
              [
                { id: 'carregados', label: 'dados reais carregados', color: '#16a34a' },
                { id: 'pendentes', label: 'dados reais pendentes', color: '#f59e0b' },
                { id: 'incompletos', label: 'dados reais incompletos', color: '#fb923c' },
                { id: 'inconsistentes', label: 'dados reais inconsistentes', color: '#f87171' },
              ] as const
            ).map((row) => (
              <span key={row.id} style={chipStyle(realDataState === row.id, row.color)}>
                {row.label}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={chipStyle(Boolean(selected), '#38bdf8')}>
              peça → dados {selected ? 'reais' : '—'}
            </span>
            <span style={chipStyle(Boolean(currentStage), currentStage?.color)}>
              estação → dados {currentStage ? 'reais' : '—'}
            </span>
            <span style={chipStyle(Boolean(selected?.operatorId), '#a3e635')}>
              operador → dados {selected?.operatorId ? 'reais' : '—'}
            </span>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Real Data Summary</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={chipStyle(true)}>dados totais {realDataSummary.total}</span>
              <span style={chipStyle(realDataSummary.valid > 0, '#16a34a')}>
                dados válidos {realDataSummary.valid}
              </span>
              <span style={chipStyle(realDataSummary.pendentes > 0, '#f59e0b')}>
                dados pendentes {realDataSummary.pendentes}
              </span>
              <span style={chipStyle(realDataSummary.inconsistentes > 0, '#f87171')}>
                dados inconsistentes {realDataSummary.inconsistentes}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={industrialSectionTitleStyle}>Full Production Engine</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(
              [
                { id: 'activa', label: 'produção activa', color: '#38bdf8' },
                { id: 'pendente', label: 'produção pendente', color: '#f59e0b' },
                { id: 'concluída', label: 'produção concluída', color: '#16a34a' },
                { id: 'bloqueada', label: 'produção bloqueada', color: '#f87171' },
              ] as const
            ).map((row) => (
              <span key={row.id} style={chipStyle(productionFlow === row.id, row.color)}>
                {row.label}
              </span>
            ))}
            <span style={chipStyle(true)}>produção geral {productionSummary.geral}</span>
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Production Timeline</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a3b2c2' }}>
              <span>tempo estimado produção {formatEstMin(TOTAL_EST_MIN)}</span>
              <span>decorrido {elapsedMin != null ? formatEstMin(elapsedMin) : '—'}</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border, #334155)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.round(((elapsedMin ?? 0) / Math.max(1, TOTAL_EST_MIN)) * 100))}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, rgba(34,211,238,0.85), rgba(56,189,248,0.95))',
                  transition: 'width 140ms ease-out',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Production Summary</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {productionSummary.byStation.map((row) => (
                <span
                  key={`prod7-st-${row.id}`}
                  style={chipStyle(
                    true,
                    row.label === 'activa'
                      ? '#38bdf8'
                      : row.label === 'lenta'
                        ? '#f97316'
                        : row.label === 'bloqueada'
                          ? '#ef4444'
                          : '#f59e0b',
                  )}
                >
                  {row.short} {row.label}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {productionSummary.byOperator.length === 0 ? (
                <span style={chipStyle(false)}>operador —</span>
              ) : (
                productionSummary.byOperator.map((row) => (
                  <span key={`prod7-op-${row.id}`} style={chipStyle(true)}>
                    op {row.id === 'sem-operador' ? 'n/d' : row.id.slice(0, 8)} · {row.label}
                  </span>
                ))
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {productionSummary.byStation.map((row) => (
                <span key={`prod7-et-${row.id}`} style={chipStyle(false)}>
                  etapa {row.short} · {row.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={industrialSectionTitleStyle}>Real Integration Engine</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={chipStyle(Boolean(selected && currentStage), '#38bdf8')}>
              peça → estação {selected && currentStage ? currentStage.short : '—'}
            </span>
            <span style={chipStyle(Boolean(currentStage && selected?.operatorId), '#a3e635')}>
              estação → operador {selected?.operatorId ? 'ok' : '—'}
            </span>
            <span style={chipStyle(Boolean(selected?.operatorId && flowIdx >= 0), '#818cf8')}>
              operador → fluxo {flowIdx >= 0 ? 'ok' : '—'}
            </span>
            <span style={chipStyle(productionFlow !== 'pendente', '#22d3ee')}>
              fluxo → produção {productionFlow}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(
              [
                { id: 'activa', label: 'integração activa', color: '#38bdf8' },
                { id: 'pendente', label: 'integração pendente', color: '#f59e0b' },
                { id: 'incompleta', label: 'integração incompleta', color: '#fb923c' },
                { id: 'inconsistente', label: 'integração inconsistente', color: '#f87171' },
              ] as const
            ).map((row) => (
              <span key={row.id} style={chipStyle(integrationState === row.id, row.color)}>
                {row.label}
              </span>
            ))}
            <span style={chipStyle(true)}>integração geral {integrationSummary.geral}</span>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Integration Timeline</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a3b2c2' }}>
              <span>tempo estimado integração {formatEstMin(stageEstMin)}</span>
              <span>decorrido {elapsedMin != null ? formatEstMin(elapsedMin) : '—'}</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border, #334155)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.round(((elapsedMin ?? 0) / Math.max(1, stageEstMin)) * 100))}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, rgba(129,140,248,0.85), rgba(56,189,248,0.95))',
                  transition: 'width 140ms ease-out',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Integration Summary</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {integrationSummary.byStation.map((row) => (
                <span key={`int-st-${row.id}`} style={chipStyle(true)}>
                  {row.short} {row.label}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {integrationSummary.byOperator.length === 0 ? (
                <span style={chipStyle(false)}>operador —</span>
              ) : (
                integrationSummary.byOperator.map((row) => (
                  <span key={`int-op-${row.id}`} style={chipStyle(true)}>
                    op {row.id === 'sem-operador' ? 'n/d' : row.id.slice(0, 8)} · {row.label}
                  </span>
                ))
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {integrationSummary.byStation.map((row) => (
                <span key={`int-et-${row.id}`} style={chipStyle(false)}>
                  etapa {row.short} · {row.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={industrialSectionTitleStyle}>Full Industrial Runtime</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(
              [
                { id: 'activo', label: 'runtime activo', color: '#38bdf8' },
                { id: 'pendente', label: 'runtime pendente', color: '#f59e0b' },
                { id: 'concluído', label: 'runtime concluído', color: '#16a34a' },
                { id: 'bloqueado', label: 'runtime bloqueado', color: '#f87171' },
              ] as const
            ).map((row) => (
              <span key={row.id} style={chipStyle(runtimeFlow === row.id, row.color)}>
                {row.label}
              </span>
            ))}
            <span style={chipStyle(true)}>runtime geral {runtimeSummary.geral}</span>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Runtime Timeline</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a3b2c2' }}>
              <span>tempo estimado runtime {formatEstMin(TOTAL_EST_MIN)}</span>
              <span>decorrido runtime {elapsedMin != null ? formatEstMin(elapsedMin) : '—'}</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border, #334155)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.round(((elapsedMin ?? 0) / Math.max(1, TOTAL_EST_MIN)) * 100))}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, rgba(251,191,36,0.85), rgba(249,115,22,0.95))',
                  transition: 'width 140ms ease-out',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Runtime Summary</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {runtimeSummary.byStation.map((row) => (
                <span
                  key={`rt-st-${row.id}`}
                  style={chipStyle(
                    true,
                    row.label === 'activo'
                      ? '#38bdf8'
                      : row.label === 'lento'
                        ? '#f97316'
                        : row.label === 'bloqueado'
                          ? '#ef4444'
                          : '#f59e0b',
                  )}
                >
                  {row.short} {row.label}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {runtimeSummary.byOperator.length === 0 ? (
                <span style={chipStyle(false)}>operador —</span>
              ) : (
                runtimeSummary.byOperator.map((row) => (
                  <span key={`rt-op-${row.id}`} style={chipStyle(true)}>
                    op {row.id === 'sem-operador' ? 'n/d' : row.id.slice(0, 8)} · {row.label}
                  </span>
                ))
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {runtimeSummary.byStation.map((row) => (
                <span key={`rt-et-${row.id}`} style={chipStyle(false)}>
                  etapa {row.short} · {row.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={industrialSectionTitleStyle}>Real Operations Engine</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(
              [
                { id: 'activa', label: 'operação activa', color: '#38bdf8' },
                { id: 'pendente', label: 'operação pendente', color: '#f59e0b' },
                { id: 'concluída', label: 'operação concluída', color: '#16a34a' },
                { id: 'bloqueada', label: 'operação bloqueada', color: '#f87171' },
              ] as const
            ).map((row) => (
              <span key={row.id} style={chipStyle(operationsFlow === row.id, row.color)}>
                {row.label}
              </span>
            ))}
            <span style={chipStyle(true)}>resumo geral {operationsSummary.geral}</span>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Operations Timeline</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a3b2c2' }}>
              <span>tempo estimado {formatEstMin(stageEstMin)}</span>
              <span>decorrido {elapsedMin != null ? formatEstMin(elapsedMin) : '—'}</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border, #334155)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.round(((elapsedMin ?? 0) / Math.max(1, stageEstMin)) * 100))}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, rgba(163,230,53,0.85), rgba(34,211,238,0.95))',
                  transition: 'width 140ms ease-out',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Operations Summary</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {operationsSummary.byStation.map((row) => (
                <span key={`ops-st-${row.id}`} style={chipStyle(true)}>
                  {row.short} {row.label}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {operationsSummary.byOperator.length === 0 ? (
                <span style={chipStyle(false)}>operador —</span>
              ) : (
                operationsSummary.byOperator.map((row) => (
                  <span key={`ops-op-${row.id}`} style={chipStyle(true)}>
                    op {row.id === 'sem-operador' ? 'n/d' : row.id.slice(0, 8)} · {row.label}
                  </span>
                ))
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {operationsSummary.byStation.map((row) => (
                <span key={`ops-et-${row.id}`} style={chipStyle(false)}>
                  etapa {row.short} · {row.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={industrialSectionTitleStyle}>Industrial Performance Engine</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span
              style={chipStyle(
                true,
                performanceEngine.geralScore >= 70
                  ? '#16a34a'
                  : performanceEngine.geralScore >= 40
                    ? '#f59e0b'
                    : '#f87171',
              )}
            >
              eficiência {performanceEngine.geralScore}%
            </span>
            <span style={chipStyle(true, heatColor(performanceEngine.velocidade as HeatTone))}>
              velocidade {performanceEngine.velocidade}
            </span>
            <span
              style={chipStyle(
                true,
                performanceEngine.estabilidade === 'alta'
                  ? '#16a34a'
                  : performanceEngine.estabilidade === 'média'
                    ? '#f59e0b'
                    : '#f87171',
              )}
            >
              estabilidade {performanceEngine.estabilidade}
            </span>
            <span
              style={chipStyle(
                true,
                performanceEngine.qualidade === 'alta'
                  ? '#16a34a'
                  : performanceEngine.qualidade === 'média'
                    ? '#f59e0b'
                    : '#f87171',
              )}
            >
              qualidade visual {performanceEngine.qualidade}
            </span>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Performance Heatmap</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {performanceEngine.byStation.map((row) => (
                <span
                  key={`perf-heat-${row.id}`}
                  title={`${row.short}: ${row.label} · ${row.score}`}
                  style={{
                    ...chipStyle(true, row.eficiente ? '#38bdf8' : '#f97316'),
                    minWidth: 52,
                    textAlign: 'center',
                    background: row.eficiente ? 'rgba(56,189,248,0.16)' : 'rgba(249,115,22,0.18)',
                  }}
                >
                  {row.short}
                  <div style={{ fontSize: 9, fontWeight: 500 }}>{row.label}</div>
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Performance Timeline</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a3b2c2' }}>
              <span>tempo estimado {formatEstMin(stageEstMin)}</span>
              <span>tempo real {elapsedMin != null ? formatEstMin(elapsedMin) : '—'}</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border, #334155)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${performanceEngine.geralScore}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, rgba(56,189,248,0.85), rgba(163,230,53,0.95))',
                  transition: 'width 140ms ease-out',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Performance Summary</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={chipStyle(true)}>performance geral {performanceEngine.geralScore}%</span>
              {performanceEngine.byStation.map((row) => (
                <span key={`perf-st-${row.id}`} style={chipStyle(true, row.eficiente ? '#38bdf8' : '#f97316')}>
                  {row.short} {row.label}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {performanceEngine.byOperator.length === 0 ? (
                <span style={chipStyle(false)}>operador —</span>
              ) : (
                performanceEngine.byOperator.map((row) => (
                  <span key={`perf-op-${row.id}`} style={chipStyle(true)}>
                    op {row.id === 'sem-operador' ? 'n/d' : row.id.slice(0, 8)} · {row.label}
                  </span>
                ))
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {performanceEngine.byStation.map((row) => (
                <span key={`perf-et-${row.id}`} style={chipStyle(false)}>
                  etapa {row.short} · {row.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={industrialSectionTitleStyle}>Final Industrial Consolidation</div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Consolidation Map</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {consolidation.engines.map((eng) => (
                <span key={eng.id} style={chipStyle(eng.ok, eng.ok ? '#16a34a' : '#f87171')}>
                  {eng.label} {eng.ok ? 'ok' : 'risco'}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>
              Integração de fluxos: {consolidation.runtimeView}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={industrialSectionTitleStyle}>Consolidation Summary</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={chipStyle(consolidation.finalOk, consolidation.finalOk ? '#16a34a' : '#f87171')}>
                resumo final {consolidation.finalOk ? 'estável' : 'em risco'}
              </span>
              <span style={chipStyle(true)}>visão runtime {runtimeSummary.geral}</span>
              <span style={chipStyle(true)}>ops {operationsSummary.geral}</span>
              <span style={chipStyle(true)}>perf {performanceEngine.geralScore}%</span>
              <span style={chipStyle(true)}>
                peças {woSummary.total} · activas {woSummary.activas} · bloqueadas {woSummary.bloqueadas}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 4 }}>
          <div style={industrialSectionTitleStyle}>Peças activas · ligação peça → estação</div>
          {activeTasks.length === 0 ? (
            <div style={{ fontSize: 12, color: '#a3b2c2' }}>Sem peças activas no filtro actual.</div>
          ) : (
            <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
              {activeTasks.map((task) => {
                const stageIdx = resolveFlowIndex(task.operationType);
                const stage = stageIdx >= 0 ? FLOW_STAGES[stageIdx] : null;
                return (
                  <li key={task.id} style={industrialListItemStyle}>
                    <div style={{ fontWeight: 600 }}>{task.pieceId}</div>
                    <div style={{ color: '#cbd5e1', fontSize: 11 }}>
                      {stage ? `${stage.label} (${stage.short})` : task.operationType} · {task.status}
                      {state.selectedTask?.id === task.id ? ' · QR activo' : ''}
                      {isVisuallyDelayed(task) ? ' · atrasada' : ''}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selected ? (
          <div style={{ fontSize: 12, color: '#cbd5e1' }}>
            QR / peça seleccionada: <strong style={{ color: '#f1f5f9' }}>{selected.pieceId}</strong>
            {' · '}
            {selected.operationType} · {selected.status}
            {currentStage ? ` · estação ${currentStage.label}` : ''}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => state.setMainMode(mode.id)}
            style={{
              ...industrialBtnStyle(state.mainMode === mode.id),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              ...(state.mainMode === mode.id
                ? {
                    boxShadow: '0 0 0 2px rgba(59,130,246,0.45)',
                    transform: 'translateY(-2px)',
                    background: 'rgba(255,255,255,0.06)',
                  }
                : { opacity: 0.85 }),
              transition: 'all 140ms ease-out',
            }}
          >
            <IndustrialSpriteIcon name={mode.icon} size={14} />
            {mode.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => state.setNotificationsOpen(!state.notificationsOpen)}
          style={{ ...industrialBtnStyle(state.notificationsOpen), marginLeft: 'auto' }}
        >
          <IndustrialSpriteIcon name="industrial-alerts" size={14} />
          Notificações
        </button>
        <button type="button" onClick={() => void state.reload()} style={industrialBtnStyle(false)}>
          Actualizar
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        {state.mainMode === 'canvas' ? (
          <StationCanvas
            pieces={canvasPieces}
            selectedPieceId={state.selectedTask?.pieceId ?? null}
            toolMode="select"
            onSelectPiece={(pieceId) => {
              const task = tasks.find((t) => t.pieceId === pieceId);
              if (task) state.setSelectedTaskId(task.id);
            }}
            onClearSelection={() => state.setSelectedTaskId(null)}
            notifications={[]}
            notificationsOpen={false}
            onToggleNotifications={() => state.setNotificationsOpen(true)}
            onDismissNotification={state.dismissAlert}
            chatOpen={false}
            onToggleChat={() => state.setMainMode('chat')}
            conversations={liveConversations}
            activeConversationId="supervisor"
            onSelectConversation={() => undefined}
            onSendChatMessage={(body) => {
              state.sendRealtimeChat({
                conversationId: 'supervisor',
                author: 'Supervisor',
                body,
                scope: 'supervisor',
                scopeId: 'supervisor',
              });
            }}
            stationLabel="Supervisor · Visão macro"
          />
        ) : null}

        {state.mainMode === 'chat' ? (
          <div style={industrialCanvasShellStyle}>
            <StationChatOverlay
              open
              conversations={liveConversations}
              activeConversationId="supervisor"
              onSelectConversation={() => undefined}
              onClose={() => state.setMainMode('canvas')}
              onSendMessage={(body, eventAttachment) => {
                state.sendRealtimeChat({
                  conversationId: 'supervisor',
                  author: 'Supervisor',
                  body,
                  scope: 'supervisor',
                  scopeId: 'supervisor',
                  eventAttachment,
                });
              }}
              enableSupervisor
            />
          </div>
        ) : null}

        {state.mainMode === 'info' ? <SupervisorInfoCards state={state} /> : null}

        {state.mainMode === 'alerts' ? (
          <div style={{ ...industrialCanvasShellStyle, padding: 16, overflow: 'auto' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.5 }}>
              Alertas detalhados
            </h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {state.alerts.map((alert) => (
                <li
                  key={alert.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    borderLeft: `4px solid ${
                      alert.level === 'success' ? '#16a34a' : alert.level === 'error' ? '#dc2626' : '#f59e0b'
                    }`,
                    minHeight: 28,
                    boxShadow:
                      '0 0 0 2px rgba(59,130,246,0.25), 0 0 0 1px #334155, 0 6px 18px rgba(0,0,0,0.55)',
                    transition: 'all 140ms ease-out',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#f1f5f9', lineHeight: 1.5 }}>{alert.title}</div>
                  <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4, lineHeight: 1.5 }}>{alert.message}</div>
                  {alert.station ? (
                    <div style={{ fontSize: 12, fontWeight: 400, color: '#a3b2c2', marginTop: 4, lineHeight: 1.5 }}>
                      Estação: {STATION_LABELS[alert.station]}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <SupervisorNotificationsOverlay
          open={state.notificationsOpen}
          alerts={state.alerts}
          onClose={() => state.setNotificationsOpen(false)}
          onDismiss={state.dismissAlert}
        />
      </div>
    </div>
  );
}
