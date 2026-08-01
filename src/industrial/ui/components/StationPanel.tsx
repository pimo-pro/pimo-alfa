import type { CSSProperties, FormEvent, ReactNode, Ref } from 'react';

import type { IndustrialWorkOrderTask } from '@/industrial/work-orders/types';
import {
  INDUSTRIAL_LIST_ITEM_CLASS,
  INDUSTRIAL_PANEL_MOTION_CLASS,
  INDUSTRIAL_VISION_ACTIVE_CLASS,
  INDUSTRIAL_VISION_SECONDARY_CLASS,
  ensureIndustrialInteractionStyles,
  industrialActionBtnStyle,
  industrialConfirmBtnStyle,
  industrialListItemStyle,
  industrialPanelDepthStyle,
  industrialSectionTitleStyle,
  industrialVisionActiveStyle,
  industrialVisionSecondaryStyle,
} from '@/industrial/ui/layouts/industrialStyles';

import type { StationActionFeedback, StationBulkAction, StationListSection } from './stationTypes';
import StationToolbar from './StationToolbar';
import type { StationToolMode } from './stationTypes';

// PIMO Industrial System — Finalization Layer
/**
 * Camada visual consolidada da estação (Fases Visuais 1–6 + Industriais 1–12).
 *
 * O que faz: representa QR, work-orders, produtividade, custos, execução, dados,
 * produção, integração, runtime, operações, performance e consolidação local —
 * apenas com chips, timelines e alertas no UI.
 *
 * Como os estados são lidos: `selectedTask`, `sections`, `codeInput`, `error` e
 * timestamps já presentes no painel; nunca via novas APIs.
 *
 * Fluxo: FLOW_STAGES (NES→EMB) mapeia `operationType` com resolveFlowIndex;
 * estados pendente/activo/concluído são derivados do índice e do status UI.
 *
 * Alertas: heurísticas visuais (atraso, custo, execução, dados, produção,
 * integração, runtime, operações, performance, consolidação) — sem handlers.
 *
 * Timelines: barras % com STAGE_EST_MIN / TOTAL_EST_MIN e elapsed visual.
 *
 * Resumos: scores e labels calculados no render a partir dos mesmos estados.
 *
 * Garantia: não toca APIs reais, StationPageShell, execution nem backend.
 */

interface StationPanelProps {
  title: string;
  description?: string;
  sections: StationListSection[];
  codeInput: string;
  onCodeInputChange: (value: string) => void;
  onCodeSubmit: (event: FormEvent) => void;
  codeInputRef?: Ref<HTMLInputElement>;
  selectedTask: IndustrialWorkOrderTask | null;
  selectedTaskIds: string[];
  selectedTasks: IndustrialWorkOrderTask[];
  onToggleTaskSelection: (taskId: string) => void;
  onRemoveFromSelection: (taskId: string) => void;
  onClearSelection: () => void;
  onBulkAction: (action: StationBulkAction) => void;
  actionFeedback?: StationActionFeedback | null;
  confirmLabel: string;
  rejectLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onReject?: () => void;
  toolMode: StationToolMode;
  snapEnabled: boolean;
  onToolMode: (mode: StationToolMode) => void;
  onToggleSnap: () => void;
  onReload?: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  extra?: ReactNode;
}

const STATUS_LABEL: Record<IndustrialWorkOrderTask['status'], string> = {
  pending: 'Pendente',
  in_progress: 'Em execução',
  completed: 'Concluído',
  rejected: 'Rejeitado',
};

/** Mapeamento visual (sem alterar estados reais da API). */
const EXEC_VISUAL: Record<
  IndustrialWorkOrderTask['status'],
  { id: 'waiting' | 'in-progress' | 'completed' | 'blocked'; label: string; color: string }
> = {
  pending: { id: 'waiting', label: 'waiting', color: '#f59e0b' },
  in_progress: { id: 'in-progress', label: 'in-progress', color: '#38bdf8' },
  completed: { id: 'completed', label: 'completed', color: '#16a34a' },
  rejected: { id: 'blocked', label: 'blocked', color: '#f87171' },
};

const FLOW_STAGES = [
  { id: 'nesting', short: 'NES', label: 'NESTING', color: '#38bdf8' },
  { id: 'cnc', short: 'CNC', label: 'CNC', color: '#818cf8' },
  { id: 'drill', short: 'DRI', label: 'DRILL', color: '#22d3ee' },
  { id: 'orlar', short: 'ORL', label: 'ORLAR', color: '#a3e635' },
  { id: 'montagem', short: 'MON', label: 'MONTAGEM', color: '#fbbf24' },
  { id: 'embalagem', short: 'EMB', label: 'EMBALAGEM', color: '#fb7185' },
] as const;

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

function progressFromOp(op: string, status?: IndustrialWorkOrderTask['status']): number {
  const cur = resolveFlowIndex(op);
  if (cur < 0) return 0;
  const step = status === 'completed' ? 1 : status === 'in_progress' ? 0.5 : 0;
  return Math.min(100, Math.round(((cur + step) / FLOW_STAGES.length) * 100));
}

/** Estimativas visuais apenas (sem APIs / sem lógica industrial). */
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

function speedLabel(
  status: IndustrialWorkOrderTask['status'] | undefined,
  load: number,
  elapsed: number | null,
  stageEst: number,
): 'rápida' | 'normal' | 'lenta' | 'bloqueada' {
  if (status === 'rejected') return 'bloqueada';
  if (elapsed != null && stageEst > 0 && elapsed > stageEst * 1.35) return 'lenta';
  if (load >= 8) return 'lenta';
  if (status === 'completed' || (elapsed != null && stageEst > 0 && elapsed < stageEst * 0.7)) return 'rápida';
  return 'normal';
}

function productivityScoreVisual(
  status: IndustrialWorkOrderTask['status'] | undefined,
  progressPct: number,
  elapsed: number | null,
  stageEst: number,
): number {
  let base =
    status === 'completed' ? 88 : status === 'in_progress' ? 62 : status === 'rejected' ? 18 : status === 'pending' ? 42 : 35;
  base = Math.round(base * 0.65 + progressPct * 0.35);
  if (elapsed != null && stageEst > 0) {
    if (elapsed > stageEst * 1.25) base = Math.max(8, base - 14);
    else if (elapsed < stageEst * 0.75) base = Math.min(99, base + 10);
  }
  return Math.min(99, Math.max(0, base));
}

/** Custos visuais apenas (sem APIs / sem cálculo financeiro real). */
const STAGE_COST_EUR = [18, 32, 24, 14, 40, 12] as const;
const TOTAL_COST_EUR = STAGE_COST_EUR.reduce((a, b) => a + b, 0);

function formatEur(n: number): string {
  if (!Number.isFinite(n)) return '€—';
  return `€${Math.round(n)}`;
}

function visualCostActual(stageCost: number, elapsed: number | null, stageEst: number): number {
  if (elapsed == null || stageEst <= 0) return stageCost;
  return Math.round(stageCost * (elapsed / stageEst));
}

export default function StationPanel({
  title,
  description,
  sections,
  codeInput,
  onCodeInputChange,
  onCodeSubmit,
  codeInputRef,
  selectedTask,
  selectedTaskIds,
  selectedTasks,
  onToggleTaskSelection,
  onRemoveFromSelection,
  onClearSelection,
  onBulkAction,
  actionFeedback,
  confirmLabel,
  rejectLabel = 'Rejeitar',
  busy = false,
  error,
  onConfirm,
  onReject,
  toolMode,
  snapEnabled,
  onToolMode,
  onToggleSnap,
  onReload,
  onToggleSidebar,
  sidebarOpen,
  extra,
}: StationPanelProps) {
  ensureIndustrialInteractionStyles();

  const hasSelection = selectedTaskIds.length > 0;
  const qrVisual: 'válido' | 'inválido' | 'pendente' = error
    ? 'inválido'
    : hasSelection || selectedTask
      ? 'válido'
      : 'pendente';
  const qrColor = qrVisual === 'válido' ? '#16a34a' : qrVisual === 'inválido' ? '#f87171' : '#f59e0b';
  const execVisual = selectedTask ? EXEC_VISUAL[selectedTask.status] : null;
  const hasData = sections.some((section) => section.items.length > 0);
  const dataVisual = hasData ? 'dados carregados' : 'dados pendentes';
  const op = (selectedTask?.operationType ?? '').toLowerCase();
  const flowIdx = resolveFlowIndex(op);
  const progressPct = selectedTask ? progressFromOp(op, selectedTask.status) : 0;
  const currentStage = flowIdx >= 0 ? FLOW_STAGES[flowIdx] : null;
  const showErro = Boolean(error);
  const stageEstMin = flowIdx >= 0 ? STAGE_EST_MIN[flowIdx] : STAGE_EST_MIN[0];
  const elapsedMin = visualElapsedMin(selectedTask);
  const sectionLoad = sections.reduce((n, s) => n + s.items.length, 0);
  const stationSpeed = speedLabel(selectedTask?.status, sectionLoad, elapsedMin, stageEstMin);
  const stationProd =
    stationSpeed === 'rápida' ? 'alta' : stationSpeed === 'lenta' ? 'baixa' : stationSpeed === 'bloqueada' ? 'crítica' : 'média';
  const operatorProd =
    selectedTask?.status === 'completed'
      ? 'alta'
      : selectedTask?.status === 'rejected'
        ? 'crítica'
        : selectedTask?.status === 'in_progress'
          ? elapsedMin != null && elapsedMin > stageEstMin * 1.25
            ? 'baixa'
            : 'média'
          : 'média';
  const prodScore = productivityScoreVisual(selectedTask?.status, progressPct, elapsedMin, stageEstMin);
  const stageCost = flowIdx >= 0 ? STAGE_COST_EUR[flowIdx] : STAGE_COST_EUR[0];
  const costActual = visualCostActual(stageCost, elapsedMin, stageEstMin);
  const costOpVisual = selectedTask?.operatorId
    ? Math.round(stageCost * (selectedTask.status === 'completed' ? 0.9 : 1.05))
    : Math.round(stageCost * 0.85);
  const nextStage = flowIdx >= 0 && flowIdx < FLOW_STAGES.length - 1 ? FLOW_STAGES[flowIdx + 1] : null;
  const prevDoneLabel =
    flowIdx > 0 ? FLOW_STAGES[flowIdx - 1]?.label : selectedTask?.status === 'completed' ? currentStage?.label : null;
  const execSignal =
    selectedTask?.status === 'completed'
      ? 'peça pronta para avançar'
      : selectedTask?.status === 'pending'
        ? selectedTask.operatorId
          ? 'peça aguardando estação'
          : 'peça aguardando operador'
        : selectedTask?.status === 'in_progress'
          ? 'peça aguardando estação'
          : null;
  const alerts: string[] = [];
  if (!selectedTask && !hasSelection && !codeInput.trim()) alerts.push('peça sem QR');
  if (selectedTask?.status === 'rejected') alerts.push('peça bloqueada');
  if (selectedTask && flowIdx < 0) alerts.push('peça sem etapa definida');
  if (!hasData) alerts.push('peça sem dados');
  if (selectedTask) {
    const ref =
      selectedTask.status === 'in_progress' && selectedTask.startedAt
        ? selectedTask.startedAt
        : selectedTask.status === 'pending'
          ? selectedTask.createdAt
          : null;
    if (ref) {
      const ageMs = Date.now() - new Date(ref).getTime();
      const limitMs = selectedTask.status === 'in_progress' ? 4 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      if (Number.isFinite(ageMs) && ageMs > limitMs) alerts.push('peça atrasada');
    }
  }
  if (stationSpeed === 'lenta') alerts.push('estação lenta');
  if (operatorProd === 'baixa') alerts.push('operador lento');
  if (elapsedMin != null && elapsedMin > stageEstMin * 1.15) alerts.push('peça acima do tempo estimado');
  if (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && selectedTask?.status !== 'pending') {
    alerts.push('peça abaixo do tempo estimado');
  }
  if (costActual > stageCost * 1.15) alerts.push('custo acima do estimado');
  if (costActual < stageCost * 0.75 && elapsedMin != null) alerts.push('custo abaixo do estimado');
  if (selectedTask?.status === 'rejected' || (flowIdx < 0 && selectedTask)) alerts.push('custo inconsistente');
  if (stationSpeed === 'lenta' || (elapsedMin != null && elapsedMin > stageEstMin * 1.35)) alerts.push('execução lenta');
  if (stationSpeed === 'rápida' || (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && selectedTask?.status === 'completed')) {
    alerts.push('execução rápida');
  }
  if (selectedTask?.status === 'rejected') alerts.push('execução bloqueada');
  if (selectedTask && flowIdx < 0) alerts.push('execução inconsistente');
  const realDataState: 'carregados' | 'pendentes' | 'incompletos' | 'inconsistentes' = showErro
    ? 'inconsistentes'
    : selectedTask && flowIdx < 0
      ? 'inconsistentes'
      : selectedTask && (!selectedTask.operationType || !hasData)
        ? 'incompletos'
        : hasData && selectedTask
          ? 'carregados'
          : 'pendentes';
  const productionFlow: 'activa' | 'pendente' | 'concluída' | 'bloqueada' =
    selectedTask?.status === 'rejected'
      ? 'bloqueada'
      : selectedTask?.status === 'completed'
        ? 'concluída'
        : selectedTask?.status === 'in_progress'
          ? 'activa'
          : 'pendente';
  const productionSignal =
    selectedTask?.status === 'completed' || (selectedTask?.status === 'pending' && qrVisual === 'válido')
      ? selectedTask?.status === 'completed'
        ? 'peça pronta para produção'
        : selectedTask.operatorId
          ? 'peça aguardando estação'
          : 'peça aguardando operador'
      : selectedTask?.status === 'in_progress'
        ? 'peça aguardando estação'
        : selectedTask
          ? 'peça aguardando operador'
          : null;
  if (realDataState === 'pendentes' || (!hasData && !selectedTask)) alerts.push('dados ausentes');
  if (realDataState === 'incompletos') alerts.push('dados incompletos');
  if (realDataState === 'inconsistentes') alerts.push('dados inconsistentes');
  if (stationSpeed === 'lenta' || (productionFlow === 'activa' && elapsedMin != null && elapsedMin > stageEstMin * 1.35)) {
    alerts.push('produção lenta');
  }
  if (stationSpeed === 'rápida' || (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && productionFlow === 'concluída')) {
    alerts.push('produção rápida');
  }
  if (productionFlow === 'bloqueada') alerts.push('produção bloqueada');
  if (selectedTask && flowIdx < 0) alerts.push('produção inconsistente');
  const integrationState: 'activa' | 'pendente' | 'incompleta' | 'inconsistente' = showErro
    ? 'inconsistente'
    : selectedTask && flowIdx < 0
      ? 'inconsistente'
      : selectedTask && (!currentStage || !selectedTask.operatorId)
        ? 'incompleta'
        : selectedTask && currentStage
          ? 'activa'
          : 'pendente';
  const runtimeFlow: 'activo' | 'pendente' | 'concluído' | 'bloqueado' =
    selectedTask?.status === 'rejected'
      ? 'bloqueado'
      : selectedTask?.status === 'completed'
        ? 'concluído'
        : selectedTask?.status === 'in_progress'
          ? 'activo'
          : 'pendente';
  const runtimeSignal =
    selectedTask?.status === 'completed'
      ? 'peça pronta para runtime'
      : selectedTask?.status === 'pending'
        ? selectedTask.operatorId
          ? 'peça aguardando estação'
          : 'peça aguardando operador'
        : selectedTask?.status === 'in_progress'
          ? 'peça aguardando estação'
          : selectedTask
            ? 'peça aguardando operador'
            : null;
  if (stationSpeed === 'lenta' || (integrationState === 'activa' && elapsedMin != null && elapsedMin > stageEstMin * 1.35)) {
    alerts.push('integração lenta');
  }
  if (stationSpeed === 'rápida' || (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && integrationState === 'activa')) {
    alerts.push('integração rápida');
  }
  if (selectedTask?.status === 'rejected') alerts.push('integração bloqueada');
  if (integrationState === 'inconsistente') alerts.push('integração inconsistente');
  if (stationSpeed === 'lenta' || (runtimeFlow === 'activo' && elapsedMin != null && elapsedMin > stageEstMin * 1.35)) {
    alerts.push('runtime lento');
  }
  if (stationSpeed === 'rápida' || (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && runtimeFlow === 'concluído')) {
    alerts.push('runtime rápido');
  }
  if (runtimeFlow === 'bloqueado') alerts.push('runtime bloqueado');
  if (selectedTask && flowIdx < 0) alerts.push('runtime inconsistente');
  const operationsFlow: 'activa' | 'pendente' | 'concluída' | 'bloqueada' =
    selectedTask?.status === 'rejected'
      ? 'bloqueada'
      : selectedTask?.status === 'completed'
        ? 'concluída'
        : selectedTask?.status === 'in_progress'
          ? 'activa'
          : 'pendente';
  const operationsSignal =
    selectedTask?.status === 'completed'
      ? 'peça pronta para operação'
      : selectedTask?.status === 'pending'
        ? selectedTask.operatorId
          ? 'peça aguardando estação'
          : 'peça aguardando operador'
        : selectedTask?.status === 'in_progress'
          ? 'peça aguardando estação'
          : selectedTask
            ? 'peça aguardando operador'
            : null;
  const efficiencyPct = Math.min(99, Math.max(8, prodScore));
  const estabilidade: 'alta' | 'média' | 'baixa' =
    selectedTask?.status === 'rejected' || showErro
      ? 'baixa'
      : stationSpeed === 'lenta'
        ? 'média'
        : 'alta';
  const qualidadeVisual: 'alta' | 'média' | 'baixa' =
    qrVisual === 'válido' && hasData ? 'alta' : qrVisual === 'inválido' || showErro ? 'baixa' : 'média';
  const perfAlert =
    efficiencyPct < 40
      ? 'performance baixa'
      : efficiencyPct >= 75
        ? 'performance alta'
        : estabilidade === 'baixa'
          ? 'performance instável'
          : null;
  if (stationSpeed === 'lenta' || (operationsFlow === 'activa' && elapsedMin != null && elapsedMin > stageEstMin * 1.35)) {
    alerts.push('operação lenta');
  }
  if (stationSpeed === 'rápida' || (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && operationsFlow === 'concluída')) {
    alerts.push('operação rápida');
  }
  if (operationsFlow === 'bloqueada') alerts.push('operação bloqueada');
  if (selectedTask && flowIdx < 0) alerts.push('operação inconsistente');
  if (perfAlert) alerts.push(perfAlert);
  if (estabilidade === 'baixa' || integrationState === 'inconsistente' || realDataState === 'inconsistentes') {
    alerts.push('consistência final em risco');
  }
  if (estabilidade === 'alta' && runtimeFlow !== 'bloqueado' && !showErro) {
    alerts.push('estabilidade final ok');
  } else if (estabilidade !== 'alta' || runtimeFlow === 'bloqueado') {
    alerts.push('estabilidade final instável');
  }
  if (showErro) alerts.push('erro');

  const selectionCount = selectedTaskIds.length;

  return (
    <section
      className={INDUSTRIAL_PANEL_MOTION_CLASS}
      style={{
        display: 'grid',
        gap: 14,
        alignContent: 'start',
        color: '#f1f5f9',
        lineHeight: 1.5,
        ...industrialPanelDepthStyle,
        borderRadius: 8,
        padding: 8,
      }}
    >
      <div
        className={selectedTask ? INDUSTRIAL_VISION_ACTIVE_CLASS : undefined}
        style={{
          display: 'grid',
          gap: 6,
          ...(selectedTask ? industrialVisionActiveStyle : industrialVisionSecondaryStyle),
        }}
      >
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.5 }}>{title}</h2>
        {description ? (
          <div style={{ fontSize: 12, fontWeight: 400, color: '#a3b2c2', lineHeight: 1.5 }}>{description}</div>
        ) : null}
        {busy ? <div style={{ fontSize: 11, color: '#38bdf8', lineHeight: 1.5 }}>A processar…</div> : null}
      </div>

      <StationToolbar
        toolMode={toolMode}
        snapEnabled={snapEnabled}
        onToolMode={onToolMode}
        onToggleSnap={onToggleSnap}
        onReload={onReload}
        onToggleSidebar={onToggleSidebar}
        sidebarOpen={sidebarOpen}
      />

      <form
        onSubmit={onCodeSubmit}
        style={{
          display: 'grid',
          gap: 8,
          ...(qrVisual === 'válido' ? industrialVisionActiveStyle : {}),
          borderLeft: `2px solid ${qrColor}`,
          paddingLeft: 8,
          transition: 'all 140ms ease-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <h3 style={industrialSectionTitleStyle}>Leitura QR / Barcode</h3>
          <span style={chipStyle(true, qrColor)}>
            {selectionCount > 0 ? `${selectionCount} seleccionada(s)` : `QR ${qrVisual}`}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
          Introduza códigos um a um (Enter adiciona automaticamente) ou cole vários separados por linha/vírgula.
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            ref={codeInputRef}
            value={codeInput}
            onChange={(e) => onCodeInputChange(e.target.value)}
            placeholder="Código da peça · Enter = adicionar"
            autoComplete="off"
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 6,
              border: `1px solid ${qrVisual === 'inválido' ? '#f87171' : qrVisual === 'válido' ? 'rgba(59,130,246,0.55)' : 'var(--border, #334155)'}`,
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-main, #f1f5f9)',
              fontSize: 12,
              boxShadow: qrVisual === 'válido' ? '0 0 0 2px rgba(59,130,246,0.45)' : undefined,
              outline: qrVisual === 'válido' ? '2px solid rgba(59,130,246,0.55)' : undefined,
              transition: 'all 140ms ease-out',
            }}
          />
          <button type="submit" style={{ ...industrialConfirmBtnStyle, background: '#334155', padding: '8px 12px' }}>
            Ler
          </button>
        </div>
      </form>

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
            style={chipStyle(
              stage.id === 'erro' ? showErro : execVisual?.id === stage.id,
              stage.color,
            )}
          >
            {stage.label}
          </span>
        ))}
        <span style={chipStyle(hasData, hasData ? '#16a34a' : '#f59e0b')}>{dataVisual}</span>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={industrialSectionTitleStyle}>Work Order Timeline</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FLOW_STAGES.map((stage, stageIdx) => {
            const stateLabel = timelineState(op, selectedTask?.status, stageIdx);
            const active = stateLabel === 'activo';
            const done = stateLabel === 'concluído';
            return (
              <span
                key={stage.id}
                title={`${stage.label} · ${stateLabel}`}
                style={{
                  ...chipStyle(active || done, done ? '#16a34a' : stage.color),
                  minWidth: 44,
                  textAlign: 'center',
                  opacity: stateLabel === 'pendente' ? 0.55 : 1,
                }}
              >
                {stage.short}
                <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.9 }}>{stateLabel}</div>
              </span>
            );
          })}
        </div>
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a3b2c2' }}>
            <span>Progresso WO</span>
            <span>{progressPct}%</span>
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
                width: `${progressPct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, rgba(59,130,246,0.85), rgba(56,189,248,0.95))',
                transition: 'width 140ms ease-out',
              }}
            />
          </div>
        </div>
        {currentStage ? (
          <div style={{ fontSize: 12, color: '#cbd5e1' }}>
            Estação responsável: <strong style={{ color: '#f1f5f9' }}>{currentStage.label}</strong>
            {selectedTask ? ` · peça ${selectedTask.pieceId}` : ''}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#a3b2c2' }}>Sem estação/etapa definida para a peça actual.</div>
        )}
      </div>

      {alerts.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {alerts.map((alert) => (
            <span key={alert} style={chipStyle(true, '#f87171')}>
              {alert}
            </span>
          ))}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={industrialSectionTitleStyle}>Productivity Engine</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={chipStyle(true)} title="Estimativa visual">
            tempo peça {formatEstMin(TOTAL_EST_MIN)}
          </span>
          <span style={chipStyle(true, currentStage?.color)} title="Estimativa visual da etapa">
            tempo etapa {formatEstMin(stageEstMin)}
            {elapsedMin != null ? ` · decorrido ${formatEstMin(elapsedMin)}` : ''}
          </span>
          <span
            style={chipStyle(
              true,
              stationSpeed === 'rápida'
                ? '#38bdf8'
                : stationSpeed === 'lenta'
                  ? '#f97316'
                  : stationSpeed === 'bloqueada'
                    ? '#ef4444'
                    : '#a3e635',
            )}
          >
            velocidade {stationSpeed}
          </span>
          <span style={chipStyle(true)}>prod. operador {operatorProd}</span>
          <span style={chipStyle(true)}>prod. estação {stationProd}</span>
          <span
            style={chipStyle(true, prodScore >= 70 ? '#16a34a' : prodScore >= 40 ? '#f59e0b' : '#f87171')}
            title="Score visual baseado em estados UI"
          >
            score {prodScore}
          </span>
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
            {currentStage ? ` · etapa actual ${currentStage.label} (${formatEstMin(stageEstMin)})` : ''}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={industrialSectionTitleStyle}>Cost Engine</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={chipStyle(true)} title="Estimativa visual">
            custo total {formatEur(TOTAL_COST_EUR)}
          </span>
          <span style={chipStyle(true, currentStage?.color)}>
            custo etapa {formatEur(stageCost)}
            {elapsedMin != null ? ` · visual ${formatEur(costActual)}` : ''}
          </span>
          <span style={chipStyle(true)}>custo estação {formatEur(stageCost)}</span>
          <span style={chipStyle(true)}>custo operador {formatEur(costOpVisual)}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FLOW_STAGES.map((stage, idx) => (
            <span
              key={`cost-${stage.id}`}
              title={`${stage.label} · ${formatEur(STAGE_COST_EUR[idx])}`}
              style={{
                ...chipStyle(idx === flowIdx, STAGE_COST_EUR[idx] >= 30 ? '#f97316' : '#38bdf8'),
                minWidth: 48,
                textAlign: 'center',
              }}
            >
              {stage.short}
              <div style={{ fontSize: 9, fontWeight: 500 }}>{formatEur(STAGE_COST_EUR[idx])}</div>
            </span>
          ))}
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
            etapa concluída {prevDoneLabel ?? (selectedTask?.status === 'completed' ? currentStage?.short : '—')}
          </span>
          {execSignal ? <span style={chipStyle(true, '#f59e0b')}>{execSignal}</span> : null}
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
          <span style={chipStyle(Boolean(selectedTask), '#38bdf8')}>
            peça → dados {selectedTask ? 'reais' : '—'}
          </span>
          <span style={chipStyle(Boolean(currentStage), currentStage?.color)}>
            estação → dados {currentStage ? 'reais' : '—'}
          </span>
          <span style={chipStyle(Boolean(selectedTask?.operatorId), '#a3e635')}>
            operador → dados {selectedTask?.operatorId ? 'reais' : '—'}
          </span>
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
          {productionSignal ? <span style={chipStyle(true, '#f59e0b')}>{productionSignal}</span> : null}
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
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={industrialSectionTitleStyle}>Real Integration Engine</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={chipStyle(Boolean(selectedTask && currentStage), '#38bdf8')}>
            peça → estação {selectedTask && currentStage ? currentStage.short : '—'}
          </span>
          <span style={chipStyle(Boolean(currentStage && selectedTask?.operatorId), '#a3e635')}>
            estação → operador {selectedTask?.operatorId ? 'ok' : '—'}
          </span>
          <span style={chipStyle(Boolean(selectedTask?.operatorId && flowIdx >= 0), '#818cf8')}>
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
          {runtimeSignal ? <span style={chipStyle(true, '#f59e0b')}>{runtimeSignal}</span> : null}
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
          {operationsSignal ? <span style={chipStyle(true, '#f59e0b')}>{operationsSignal}</span> : null}
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
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={industrialSectionTitleStyle}>Industrial Performance Engine</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={chipStyle(true, efficiencyPct >= 70 ? '#16a34a' : efficiencyPct >= 40 ? '#f59e0b' : '#f87171')}>
            eficiência {efficiencyPct}%
          </span>
          <span
            style={chipStyle(
              true,
              stationSpeed === 'rápida'
                ? '#38bdf8'
                : stationSpeed === 'lenta'
                  ? '#f97316'
                  : stationSpeed === 'bloqueada'
                    ? '#ef4444'
                    : '#a3e635',
            )}
          >
            velocidade {stationSpeed}
          </span>
          <span
            style={chipStyle(
              true,
              estabilidade === 'alta' ? '#16a34a' : estabilidade === 'média' ? '#f59e0b' : '#f87171',
            )}
          >
            estabilidade {estabilidade}
          </span>
          <span
            style={chipStyle(
              true,
              qualidadeVisual === 'alta' ? '#16a34a' : qualidadeVisual === 'média' ? '#f59e0b' : '#f87171',
            )}
          >
            qualidade visual {qualidadeVisual}
          </span>
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
                width: `${efficiencyPct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, rgba(56,189,248,0.85), rgba(163,230,53,0.95))',
                transition: 'width 140ms ease-out',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <div style={industrialSectionTitleStyle}>Final Consolidation · local</div>
        <div style={{ fontSize: 12, color: '#cbd5e1' }}>
          Runtime {runtimeFlow} · integração {integrationState} · produção {productionFlow} · dados {realDataState}
        </div>
      </div>

      {hasSelection ? (
        <div
          style={{
            display: 'grid',
            gap: 8,
            borderLeft: '2px solid rgba(34,197,94,0.55)',
            paddingLeft: 8,
            ...industrialVisionActiveStyle,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <h3 style={{ ...industrialSectionTitleStyle, margin: 0 }}>
              Peças seleccionadas ({selectionCount})
            </h3>
            <button type="button" onClick={onClearSelection} style={industrialActionBtnStyle}>
              Limpar
            </button>
          </div>
          <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4, maxHeight: 160, overflow: 'auto' }}>
            {selectedTasks.map((task) => (
              <li
                key={task.id}
                style={{
                  ...industrialListItemStyle,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 12 }}>{task.pieceId}</div>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>
                    {task.operationType} · {STATUS_LABEL[task.status]}
                    {task.display?.nqrCode ? ` · ${task.display.nqrCode}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFromSelection(task.id)}
                  style={industrialActionBtnStyle}
                  title="Remover da selecção"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p
          className={INDUSTRIAL_VISION_SECONDARY_CLASS}
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 400,
            color: '#a3b2c2',
            lineHeight: 1.5,
            ...industrialVisionSecondaryStyle,
          }}
        >
          Leia códigos ou marque checkboxes para seleccionar peças.
        </p>
      )}

      {selectedTask && !hasSelection ? (
        <dl
          className={INDUSTRIAL_VISION_ACTIVE_CLASS}
          style={{ margin: 0, display: 'grid', gap: 6, fontSize: 12, ...industrialVisionActiveStyle }}
        >
          <div>
            <dt style={{ color: '#a3b2c2' }}>Peça seleccionada</dt>
            <dd style={{ margin: 0, color: '#f1f5f9' }}>{selectedTask.pieceId}</dd>
          </div>
          <div>
            <dt style={{ color: '#a3b2c2' }}>Operação</dt>
            <dd style={{ margin: 0, color: '#f1f5f9' }}>{selectedTask.operationType}</dd>
          </div>
          <div>
            <dt style={{ color: '#a3b2c2' }}>Estado</dt>
            <dd style={{ margin: 0, color: '#f1f5f9' }}>
              {STATUS_LABEL[selectedTask.status]}
              {execVisual ? ` · ${execVisual.label}` : ''}
            </dd>
          </div>
        </dl>
      ) : null}

      {sections.map((section) => (
        <div
          key={section.title}
          className={hasSelection || selectedTask ? INDUSTRIAL_VISION_SECONDARY_CLASS : undefined}
          style={{
            display: 'grid',
            gap: 6,
            ...(hasSelection || selectedTask ? industrialVisionSecondaryStyle : {}),
            borderLeft: '2px solid rgba(59,130,246,0.25)',
            paddingLeft: 8,
            transition: 'all 140ms ease-out',
          }}
        >
          <h3 style={industrialSectionTitleStyle}>{section.title}</h3>
          <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 4 }}>
            {section.items.length === 0 ? (
              <li style={{ fontSize: 12, color: '#a3b2c2', lineHeight: 1.5 }}>Sem itens · dados pendentes.</li>
            ) : (
              section.items.map((item, index) => {
                const taskId = item.taskId;
                const selectable = Boolean(taskId);
                const checked = taskId ? selectedTaskIds.includes(taskId) : false;
                const focused =
                  (taskId && selectedTask?.id === taskId) ||
                  (item.pieceId && selectedTask?.pieceId === item.pieceId);

                return (
                  <li
                    key={item.id}
                    className={INDUSTRIAL_LIST_ITEM_CLASS}
                    style={{
                      ...industrialListItemStyle,
                      animationDelay: `${index * 30}ms`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      cursor: selectable ? 'pointer' : 'default',
                      ...(checked || focused
                        ? {
                            boxShadow: '0 0 0 2px rgba(59,130,246,0.45)',
                            outline: '2px solid rgba(59,130,246,0.55)',
                            background: 'rgba(255,255,255,0.06)',
                            transform: 'translateY(-2px)',
                          }
                        : {}),
                    }}
                    data-active={checked || focused ? 'true' : undefined}
                    onClick={() => {
                      if (taskId) onToggleTaskSelection(taskId);
                    }}
                  >
                    {selectable ? (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleTaskSelection(taskId!)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ marginTop: 2, flexShrink: 0 }}
                        aria-label={`Seleccionar ${item.primary}`}
                      />
                    ) : null}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{item.primary}</div>
                      {item.secondary ? (
                        <div style={{ color: '#cbd5e1', marginTop: 2, lineHeight: 1.5 }}>{item.secondary}</div>
                      ) : null}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ))}

      {extra}

      {error ? <p style={{ margin: 0, color: '#f87171', fontSize: 12 }}>{error}</p> : null}

      {actionFeedback ? (
        <p
          style={{
            margin: 0,
            color: actionFeedback.ok ? '#16a34a' : '#f87171',
            fontSize: 12,
            fontWeight: 600,
            padding: '8px 10px',
            borderRadius: 6,
            background: actionFeedback.ok ? 'rgba(22,163,74,0.12)' : 'rgba(248,113,113,0.12)',
            border: `1px solid ${actionFeedback.ok ? 'rgba(22,163,74,0.35)' : 'rgba(248,113,113,0.35)'}`,
          }}
        >
          {actionFeedback.message}
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={!hasSelection || busy}
          onClick={() => onBulkAction('start')}
          style={{
            ...industrialConfirmBtnStyle,
            background: '#0369a1',
            opacity: !hasSelection ? 0.4 : 1,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          Iniciar
        </button>
        <button
          type="button"
          disabled={!hasSelection || busy}
          onClick={onConfirm}
          style={{
            ...industrialConfirmBtnStyle,
            opacity: !hasSelection ? 0.4 : 1,
            cursor: busy ? 'wait' : 'pointer',
          }}
          title={confirmLabel}
        >
          Concluir
        </button>
        <button
          type="button"
          disabled={!hasSelection || busy}
          onClick={() => (onReject ? onReject() : onBulkAction('reject'))}
          style={{
            ...industrialActionBtnStyle,
            padding: '10px 18px',
            cursor: busy ? 'wait' : 'pointer',
            opacity: !hasSelection ? 0.4 : 1,
          }}
        >
          {rejectLabel}
        </button>
      </div>
    </section>
  );
}
