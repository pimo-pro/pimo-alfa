import type { CSSProperties } from 'react';

import {
  INDUSTRIAL_LIST_ITEM_CLASS,
  INDUSTRIAL_PANEL_MOTION_CLASS,
  INDUSTRIAL_VISION_ACTIVE_CLASS,
  INDUSTRIAL_VISION_SECONDARY_CLASS,
  ensureIndustrialInteractionStyles,
  industrialActionBtnStyle,
  industrialBtnStyle,
  industrialListItemStyle,
  industrialPanelDepthStyle,
  industrialSectionTitleStyle,
  industrialVisionActiveStyle,
  industrialVisionSecondaryStyle,
} from '@/industrial/ui/layouts/industrialStyles';
import { STATION_LABELS } from '@/industrial/work-orders/types';

import type { UseOperatorPageReturnExtended } from '../hooks/useOperatorPage';
import OperatorLogPanel from './OperatorLogPanel';
import OperatorMessagesPanel from './OperatorMessagesPanel';

// PIMO Industrial System — Finalization Layer
/**
 * Camada visual consolidada da sessão do operador (Fases Visuais + Industriais 1–12).
 *
 * O que faz: espelha no painel de sessão livre os mesmos indicadores industriais
 * (QR, WO timeline, produtividade, execução, dados, produção, integração,
 * runtime, operações, performance e consolidação local).
 *
 * Estados lidos: `state.pieces`, `sessionStats`, `workOrderSummaries`,
 * `executingOperation`, `codeInput`, `error` — dados já no UI.
 *
 * Fluxo: FLOW_STAGES + resolveFlowIndex sobre operação activa / tarefa da peça.
 *
 * Alertas / timelines / scores: representação visual no render; sem APIs novas
 * e sem alterar executeOperation / loadFromWorkOrder / hooks do operador.
 *
 * Garantia: cosmético + leitura leve; impacto operacional zero.
 */

type Props = {
  state: UseOperatorPageReturnExtended;
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

function timelineState(op: string, status: string | undefined, stageIdx: number): 'pendente' | 'activo' | 'concluído' {
  const cur = resolveFlowIndex(op);
  if (cur < 0) return 'pendente';
  if (stageIdx < cur) return 'concluído';
  if (stageIdx > cur) return 'pendente';
  if (status === 'completed') return 'concluído';
  return 'activo';
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

function visualElapsedMin(task: { status?: string; startedAt?: string; completedAt?: string; createdAt?: string } | null): number | null {
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

export default function OperatorSessionPanel({ state }: Props) {
  ensureIndustrialInteractionStyles();
  const hasPieces = state.sessionStats.pieceCount > 0;
  const activePiece =
    state.pieces.find((p) => p.pieceId === state.selectedPieceId) ??
    state.pieces.find((p) => p.selected) ??
    null;
  const qrVisual: 'válido' | 'inválido' | 'pendente' = state.error
    ? 'inválido'
    : activePiece || state.codeInput.trim()
      ? activePiece
        ? 'válido'
        : 'pendente'
      : 'pendente';
  const qrColor = qrVisual === 'válido' ? '#16a34a' : qrVisual === 'inválido' ? '#f87171' : '#f59e0b';
  const progressPct =
    state.sessionStats.pieceCount > 0
      ? Math.min(
          100,
          Math.round((state.sessionStats.operationCount / Math.max(1, state.sessionStats.pieceCount)) * 100),
        )
      : 0;
  const dataVisual = hasPieces || state.workOrderSummaries.length > 0 ? 'dados carregados' : 'dados pendentes';
  const activeTask = activePiece?.tasks?.find((t) => t.status === 'in_progress') ?? activePiece?.tasks?.[0] ?? null;
  const op = (state.executingOperation || activeTask?.operationType || '').toLowerCase();
  const execVisual = state.executingOperation
    ? { id: 'in-progress' as const, color: '#38bdf8' }
    : activeTask?.status === 'rejected'
      ? { id: 'blocked' as const, color: '#f87171' }
      : activeTask?.status === 'completed'
        ? { id: 'completed' as const, color: '#16a34a' }
        : activePiece
          ? { id: 'waiting' as const, color: '#f59e0b' }
          : null;
  const showErro = Boolean(state.error);
  const flowIdx = resolveFlowIndex(op);
  const currentStage = flowIdx >= 0 ? FLOW_STAGES[flowIdx] : null;
  const stageEstMin = flowIdx >= 0 ? STAGE_EST_MIN[flowIdx] : STAGE_EST_MIN[0];
  const elapsedMin = visualElapsedMin(activeTask);
  const opsPerPiece =
    state.sessionStats.pieceCount > 0
      ? state.sessionStats.operationCount / state.sessionStats.pieceCount
      : 0;
  const stationSpeed: 'rápida' | 'normal' | 'lenta' | 'bloqueada' =
    activeTask?.status === 'rejected'
      ? 'bloqueada'
      : elapsedMin != null && elapsedMin > stageEstMin * 1.35
        ? 'lenta'
        : opsPerPiece >= 1.2 || progressPct >= 80
          ? 'rápida'
          : opsPerPiece < 0.4 && hasPieces
            ? 'lenta'
            : 'normal';
  const operatorProd =
    opsPerPiece >= 1.2
      ? 'alta'
      : activeTask?.status === 'rejected' || (elapsedMin != null && elapsedMin > stageEstMin * 1.25)
        ? 'baixa'
        : hasPieces
          ? 'média'
          : '—';
  const stationProd =
    stationSpeed === 'rápida' ? 'alta' : stationSpeed === 'lenta' ? 'baixa' : stationSpeed === 'bloqueada' ? 'crítica' : 'média';
  let prodScore = Math.round(
    (activeTask?.status === 'completed' ? 88 : activeTask?.status === 'in_progress' ? 62 : activeTask?.status === 'rejected' ? 18 : 40) *
      0.55 +
      progressPct * 0.45,
  );
  if (elapsedMin != null && elapsedMin > stageEstMin * 1.25) prodScore = Math.max(8, prodScore - 14);
  if (elapsedMin != null && elapsedMin < stageEstMin * 0.75 && activeTask) prodScore = Math.min(99, prodScore + 10);
  prodScore = Math.min(99, Math.max(0, prodScore));

  const alerts: string[] = [];
  if (!activePiece && !state.codeInput.trim()) alerts.push('peça sem QR');
  if (activeTask?.status === 'rejected') alerts.push('peça bloqueada');
  if (activePiece && flowIdx < 0 && !state.executingOperation) alerts.push('peça sem etapa definida');
  if (!hasPieces && state.workOrderSummaries.length === 0) alerts.push('peça sem dados');
  if (activeTask) {
    const ref =
      activeTask.status === 'in_progress' && activeTask.startedAt
        ? activeTask.startedAt
        : activeTask.status === 'pending'
          ? activeTask.createdAt
          : null;
    if (ref) {
      const ageMs = Date.now() - new Date(ref).getTime();
      const limitMs = activeTask.status === 'in_progress' ? 4 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      if (Number.isFinite(ageMs) && ageMs > limitMs) alerts.push('peça atrasada');
    }
  }
  if (stationSpeed === 'lenta') alerts.push('estação lenta');
  if (operatorProd === 'baixa') alerts.push('operador lento');
  if (elapsedMin != null && elapsedMin > stageEstMin * 1.15) alerts.push('peça acima do tempo estimado');
  if (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && activeTask?.status !== 'pending') {
    alerts.push('peça abaixo do tempo estimado');
  }
  const nextStage = flowIdx >= 0 && flowIdx < FLOW_STAGES.length - 1 ? FLOW_STAGES[flowIdx + 1] : null;
  const prevDoneLabel =
    flowIdx > 0
      ? FLOW_STAGES[flowIdx - 1]?.label
      : activeTask?.status === 'completed'
        ? currentStage?.label
        : null;
  const execSignal =
    activeTask?.status === 'completed'
      ? 'peça pronta para avançar'
      : activeTask?.status === 'pending'
        ? activeTask.operatorId
          ? 'peça aguardando estação'
          : 'peça aguardando operador'
        : state.executingOperation
          ? 'peça aguardando estação'
          : activePiece && !state.executingOperation
            ? 'peça aguardando operador'
            : null;
  if (stationSpeed === 'lenta' || (elapsedMin != null && elapsedMin > stageEstMin * 1.35)) alerts.push('execução lenta');
  if (
    stationSpeed === 'rápida' ||
    (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && activeTask?.status === 'completed')
  ) {
    alerts.push('execução rápida');
  }
  if (activeTask?.status === 'rejected') alerts.push('execução bloqueada');
  if (activePiece && flowIdx < 0 && !state.executingOperation) alerts.push('execução inconsistente');
  const realDataState: 'carregados' | 'pendentes' | 'incompletos' | 'inconsistentes' = showErro
    ? 'inconsistentes'
    : activePiece && flowIdx < 0 && !state.executingOperation
      ? 'inconsistentes'
      : activePiece && (!activeTask || !activeTask.operationType)
        ? 'incompletos'
        : hasPieces || state.workOrderSummaries.length > 0
          ? 'carregados'
          : 'pendentes';
  const productionFlow: 'activa' | 'pendente' | 'concluída' | 'bloqueada' =
    activeTask?.status === 'rejected'
      ? 'bloqueada'
      : activeTask?.status === 'completed'
        ? 'concluída'
        : state.executingOperation || activeTask?.status === 'in_progress'
          ? 'activa'
          : 'pendente';
  const productionSignal =
    activeTask?.status === 'completed'
      ? 'peça pronta para produção'
      : activeTask?.status === 'pending'
        ? activeTask.operatorId
          ? 'peça aguardando estação'
          : 'peça aguardando operador'
        : state.executingOperation
          ? 'peça aguardando estação'
          : activePiece
            ? 'peça aguardando operador'
            : null;
  if (realDataState === 'pendentes' || (!hasPieces && state.workOrderSummaries.length === 0)) alerts.push('dados ausentes');
  if (realDataState === 'incompletos') alerts.push('dados incompletos');
  if (realDataState === 'inconsistentes') alerts.push('dados inconsistentes');
  if (stationSpeed === 'lenta' || (elapsedMin != null && elapsedMin > stageEstMin * 1.35 && productionFlow === 'activa')) {
    alerts.push('produção lenta');
  }
  if (stationSpeed === 'rápida' || (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && productionFlow === 'concluída')) {
    alerts.push('produção rápida');
  }
  if (productionFlow === 'bloqueada') alerts.push('produção bloqueada');
  if (activePiece && flowIdx < 0 && !state.executingOperation) alerts.push('produção inconsistente');
  const integrationState: 'activa' | 'pendente' | 'incompleta' | 'inconsistente' = showErro
    ? 'inconsistente'
    : activePiece && flowIdx < 0 && !state.executingOperation
      ? 'inconsistente'
      : activePiece && (!currentStage || (!activeTask?.operatorId && !state.executingOperation))
        ? 'incompleta'
        : activePiece && (currentStage || state.executingOperation)
          ? 'activa'
          : 'pendente';
  const runtimeFlow: 'activo' | 'pendente' | 'concluído' | 'bloqueado' =
    activeTask?.status === 'rejected'
      ? 'bloqueado'
      : activeTask?.status === 'completed'
        ? 'concluído'
        : state.executingOperation || activeTask?.status === 'in_progress'
          ? 'activo'
          : 'pendente';
  const runtimeSignal =
    activeTask?.status === 'completed'
      ? 'peça pronta para runtime'
      : activeTask?.status === 'pending'
        ? activeTask.operatorId
          ? 'peça aguardando estação'
          : 'peça aguardando operador'
        : state.executingOperation
          ? 'peça aguardando estação'
          : activePiece
            ? 'peça aguardando operador'
            : null;
  if (stationSpeed === 'lenta' || (integrationState === 'activa' && elapsedMin != null && elapsedMin > stageEstMin * 1.35)) {
    alerts.push('integração lenta');
  }
  if (stationSpeed === 'rápida' || (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && integrationState === 'activa')) {
    alerts.push('integração rápida');
  }
  if (activeTask?.status === 'rejected') alerts.push('integração bloqueada');
  if (integrationState === 'inconsistente') alerts.push('integração inconsistente');
  if (stationSpeed === 'lenta' || (runtimeFlow === 'activo' && elapsedMin != null && elapsedMin > stageEstMin * 1.35)) {
    alerts.push('runtime lento');
  }
  if (stationSpeed === 'rápida' || (elapsedMin != null && elapsedMin < stageEstMin * 0.7 && runtimeFlow === 'concluído')) {
    alerts.push('runtime rápido');
  }
  if (runtimeFlow === 'bloqueado') alerts.push('runtime bloqueado');
  if (activePiece && flowIdx < 0 && !state.executingOperation) alerts.push('runtime inconsistente');
  const operationsFlow: 'activa' | 'pendente' | 'concluída' | 'bloqueada' =
    activeTask?.status === 'rejected'
      ? 'bloqueada'
      : activeTask?.status === 'completed'
        ? 'concluída'
        : state.executingOperation || activeTask?.status === 'in_progress'
          ? 'activa'
          : 'pendente';
  const operationsSignal =
    activeTask?.status === 'completed'
      ? 'peça pronta para operação'
      : activeTask?.status === 'pending'
        ? activeTask.operatorId
          ? 'peça aguardando estação'
          : 'peça aguardando operador'
        : state.executingOperation
          ? 'peça aguardando estação'
          : activePiece
            ? 'peça aguardando operador'
            : null;
  const efficiencyPct = Math.min(99, Math.max(8, prodScore));
  const estabilidade: 'alta' | 'média' | 'baixa' =
    activeTask?.status === 'rejected' || showErro
      ? 'baixa'
      : stationSpeed === 'lenta'
        ? 'média'
        : 'alta';
  const qualidadeVisual: 'alta' | 'média' | 'baixa' =
    qrVisual === 'válido' && hasPieces ? 'alta' : qrVisual === 'inválido' || showErro ? 'baixa' : 'média';
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
  if (activePiece && flowIdx < 0 && !state.executingOperation) alerts.push('operação inconsistente');
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

  return (
    <div
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
      <header className={INDUSTRIAL_VISION_ACTIVE_CLASS} style={industrialVisionActiveStyle}>
        <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.5 }}>
          Operador · Sessão livre
        </h2>
        <p style={{ margin: '10px 0 0', fontSize: 12, fontWeight: 400, color: '#a3b2c2', lineHeight: 1.5 }}>
          Sessão: {state.operatorSession}
          {state.realtimeConnected ? ' · RTO live' : ''}
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gap: 8,
          borderLeft: `2px solid ${qrColor}`,
          paddingLeft: 8,
          ...(qrVisual === 'válido' ? industrialVisionActiveStyle : industrialVisionSecondaryStyle),
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <h3 style={industrialSectionTitleStyle}>QR activo</h3>
          <span style={chipStyle(true, qrColor)}>QR {qrVisual}</span>
        </div>
        <div style={{ fontSize: 12, color: '#f1f5f9', fontFamily: 'monospace' }}>
          {activePiece?.qrPayload || state.codeInput.trim() || activePiece?.pieceId || '— sem código —'}
        </div>
        {activePiece ? (
          <div style={{ fontSize: 12, color: '#cbd5e1' }}>
            Peça actual: {activePiece.pieceId}
            {activePiece.pieceName ? ` · ${activePiece.pieceName}` : ''}
            {activePiece.qrPayload ? ` · QR ${activePiece.qrPayload}` : ''}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#a3b2c2' }}>Nenhuma peça seleccionada</div>
        )}
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
        <span style={chipStyle(dataVisual === 'dados carregados', '#16a34a')}>{dataVisual}</span>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={industrialSectionTitleStyle}>Work Order Timeline</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FLOW_STAGES.map((stage, stageIdx) => {
            const stateLabel = timelineState(op, activeTask?.status, stageIdx);
            const done = stateLabel === 'concluído';
            const active = stateLabel === 'activo';
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
                <div style={{ fontSize: 9, fontWeight: 500 }}>{stateLabel}</div>
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
            {activePiece ? ` · peça ${activePiece.pieceId}` : ''}
          </div>
        ) : null}
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
          <span style={chipStyle(true)}>tempo peça {formatEstMin(TOTAL_EST_MIN)}</span>
          <span style={chipStyle(true, currentStage?.color)}>
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
          <span style={chipStyle(true, prodScore >= 70 ? '#16a34a' : prodScore >= 40 ? '#f59e0b' : '#f87171')}>
            score {prodScore}
          </span>
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
            etapa concluída {prevDoneLabel ?? (activeTask?.status === 'completed' ? currentStage?.short : '—')}
          </span>
          {execSignal ? <span style={chipStyle(true, '#f59e0b')}>{execSignal}</span> : null}
        </div>
        <div style={{ fontSize: 12, color: '#cbd5e1' }}>
          Tempo etapa {formatEstMin(stageEstMin)}
          {elapsedMin != null ? ` · decorrido ${formatEstMin(elapsedMin)}` : ''}
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
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={industrialSectionTitleStyle}>Real Integration Engine</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={chipStyle(Boolean(activePiece && currentStage), '#38bdf8')}>
            peça → estação {activePiece && currentStage ? currentStage.short : '—'}
          </span>
          <span style={chipStyle(Boolean(currentStage || state.executingOperation), '#a3e635')}>
            estação → operador {state.operatorSession || '—'}
          </span>
          <span style={chipStyle(Boolean(state.operatorSession && flowIdx >= 0), '#818cf8')}>
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
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <div style={industrialSectionTitleStyle}>Final Consolidation · local</div>
        <div style={{ fontSize: 12, color: '#cbd5e1' }}>
          Runtime {runtimeFlow} · integração {integrationState} · produção {productionFlow} · dados {realDataState}
        </div>
      </div>

      <div
        className={hasPieces ? INDUSTRIAL_VISION_ACTIVE_CLASS : INDUSTRIAL_VISION_SECONDARY_CLASS}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          ...(hasPieces ? industrialVisionActiveStyle : industrialVisionSecondaryStyle),
        }}
      >
        <div style={industrialListItemStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#a3b2c2', textTransform: 'uppercase', lineHeight: 1.5 }}>
            Peças na sessão
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{state.sessionStats.pieceCount}</div>
        </div>
        <div style={industrialListItemStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#a3b2c2', textTransform: 'uppercase', lineHeight: 1.5 }}>
            Operações executadas
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{state.sessionStats.operationCount}</div>
        </div>
      </div>

      <OperatorLogPanel entries={state.operationsLog} />

      <OperatorMessagesPanel messages={state.messages} />

      <section
        className={
          state.workOrderSummaries.length > 0 ? INDUSTRIAL_VISION_ACTIVE_CLASS : INDUSTRIAL_VISION_SECONDARY_CLASS
        }
        style={
          state.workOrderSummaries.length > 0 ? industrialVisionActiveStyle : industrialVisionSecondaryStyle
        }
      >
        <h3 style={{ ...industrialSectionTitleStyle, marginBottom: 8 }}>Ordens de trabalho</h3>
        <button
          type="button"
          disabled={state.loading || state.loadingWorkOrders}
          onClick={() => void state.loadAllWorkOrderPieces()}
          style={industrialActionBtnStyle}
        >
          {state.loadingWorkOrders ? 'A carregar…' : 'Carregar peças da ordem'}
        </button>

        {state.workOrderSummaries.length > 0 ? (
          <ul style={{ margin: '10px 0 0', padding: 0, display: 'grid', gap: 6, maxHeight: 160, overflow: 'auto' }}>
            {state.workOrderSummaries.slice(0, 8).map((summary, index) => (
              <li
                key={summary.order.id}
                className={INDUSTRIAL_LIST_ITEM_CLASS}
                style={{ ...industrialListItemStyle, animationDelay: `${index * 30}ms` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.5 }}>
                      {STATION_LABELS[summary.order.station] ?? summary.order.station}
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                      {summary.pieceCount} peça(s) · {summary.pendingCount} pendente(s)
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={state.loading}
                    onClick={() => void state.loadFromWorkOrder(summary.order.id)}
                    style={{
                      ...industrialBtnStyle(false),
                      opacity: state.loading ? 0.4 : 1,
                    }}
                  >
                    Carregar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: '10px 0 0', fontSize: 12, fontWeight: 400, color: '#a3b2c2', lineHeight: 1.5 }}>
            Nenhuma ordem de trabalho activa atribuída · dados pendentes.
          </p>
        )}
      </section>

      {state.error ? <p style={{ margin: 0, color: '#f87171', fontSize: 12 }}>{state.error}</p> : null}

      <button type="button" onClick={state.clearSession} style={industrialBtnStyle(false)}>
        Limpar sessão
      </button>
    </div>
  );
}
