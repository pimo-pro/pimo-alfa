import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/auth/useAuth';
import {
  fetchOperatorMessages,
  fetchOperatorPieceState,
  fetchOperatorWorkOrderSummaries,
  fetchWorkOrderPieceIds,
  recordOperatorOperation,
  resolveAndLoadPieceByCode,
  resolveAndLoadPiecesByCodes,
} from '@/industrial/api/operatorActions';
import { normalizeIndustrialCode } from '@/industrial/operador/normalizeIndustrialCode';
import { OPERATOR_SESSION_FREE } from '@/industrial/operador/constants';
import type { ProjetosPieceOperationId } from '@/industrial/integration/projetos/types';
import { useIndustrialRealtime } from '@/industrial/realtime';
import { useIndustrialPageState } from '@/industrial/ui/components';

import type { OperatorSessionPiece, UseOperatorPageReturn } from '../types';

const MAX_LOG = 50;

function toSessionPiece(
  state: Awaited<ReturnType<typeof fetchOperatorPieceState>>,
  selected = false,
): OperatorSessionPiece {
  return { ...state!, selected };
}

export function useOperatorPage(): UseOperatorPageReturn {
  useIndustrialPageState();
  const { user } = useAuth();

  const [mode, setModeState] = useState<'single' | 'batch'>('single');
  const [pieces, setPieces] = useState<OperatorSessionPiece[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedPieceIds, setSelectedPieceIds] = useState<string[]>([]);
  const [operationsLog, setOperationsLog] = useState<UseOperatorPageReturn['operationsLog']>([]);
  const [messages, setMessages] = useState<UseOperatorPageReturn['messages']>([]);
  const [workOrderSummaries, setWorkOrderSummaries] = useState<UseOperatorPageReturn['workOrderSummaries']>([]);
  const [loading, setLoading] = useState(false);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [executingOperation, setExecutingOperation] = useState<ProjetosPieceOperationId | null>(null);

  const operatorSession = OPERATOR_SESSION_FREE;
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      void refreshAllPiecesRef.current();
      void refreshMessagesRef.current();
      void refreshWorkOrdersRef.current();
    }, 600);
  }, []);

  const realtime = useIndustrialRealtime({
    mode: 'operator',
    onDataRefresh: scheduleRefresh,
  });

  const refreshAllPiecesRef = useRef<() => Promise<void>>(async () => undefined);
  const refreshMessagesRef = useRef<() => Promise<void>>(async () => undefined);
  const refreshWorkOrdersRef = useRef<() => Promise<void>>(async () => undefined);

  const setMode = useCallback((next: 'single' | 'batch') => {
    setModeState(next);
    setError(null);
    if (next === 'single') {
      setSelectedPieceIds([]);
    } else {
      setSelectedPieceId(null);
    }
  }, []);

  const upsertPiece = useCallback((piece: OperatorSessionPiece) => {
    setPieces((prev) => {
      const index = prev.findIndex((row) => row.pieceId === piece.pieceId);
      if (index < 0) return [...prev, piece];
      const next = [...prev];
      next[index] = { ...piece, selected: next[index]?.selected ?? piece.selected };
      return next;
    });
  }, []);

  const upsertPieces = useCallback((rows: OperatorSessionPiece[]) => {
    setPieces((prev) => {
      const map = new Map(prev.map((row) => [row.pieceId, row]));
      for (const row of rows) {
        map.set(row.pieceId, { ...row, selected: map.get(row.pieceId)?.selected ?? row.selected });
      }
      return Array.from(map.values());
    });
  }, []);

  const loadSingleCode = useCallback(
    async (codeOverride?: string) => {
      const code = normalizeIndustrialCode(codeOverride ?? codeInput);
      if (!code) {
        setError('Introduza um código NQR ou identificador da peça.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const state = await resolveAndLoadPieceByCode(code);
        if (!state) {
          setError(`Peça não encontrada para o código "${code}".`);
          return;
        }

        upsertPiece(toSessionPiece(state, true));
        setSelectedPieceId(state.pieceId);
        if (!codeOverride) setCodeInput('');
        void refreshMessagesRef.current();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar peça.');
      } finally {
        setLoading(false);
      }
    },
    [codeInput, upsertPiece],
  );

  const loadBatchCodes = useCallback(
    async (rawOverride?: string) => {
      const raw = rawOverride ?? batchInput.trim() ?? codeInput.trim();
      if (!raw) {
        setError('Introduza uma lista de códigos (um por linha ou separados por vírgula).');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const states = await resolveAndLoadPiecesByCodes([raw]);
        if (states.length === 0) {
          setError('Nenhuma peça encontrada para os códigos introduzidos.');
          return;
        }

        upsertPieces(states.map((state) => toSessionPiece(state, true)));
        setSelectedPieceIds(states.map((row) => row.pieceId));
        if (!rawOverride) {
          setBatchInput('');
          setCodeInput('');
        }
        void refreshMessagesRef.current();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar lote.');
      } finally {
        setLoading(false);
      }
    },
    [batchInput, codeInput, upsertPieces],
  );

  const refreshWorkOrders = useCallback(async () => {
    setLoadingWorkOrders(true);
    try {
      const summaries = await fetchOperatorWorkOrderSummaries(user?.id);
      setWorkOrderSummaries(summaries);
    } catch {
      // Silencioso — painel WO é auxiliar.
    } finally {
      setLoadingWorkOrders(false);
    }
  }, [user?.id]);

  refreshWorkOrdersRef.current = refreshWorkOrders;

  const refreshMessages = useCallback(async () => {
    try {
      const pieceIds = pieces.map((p) => p.pieceId);
      const next = await fetchOperatorMessages(user?.id, pieceIds);
      setMessages(next);
    } catch {
      // Silencioso.
    }
  }, [pieces, user?.id]);

  refreshMessagesRef.current = refreshMessages;

  const loadFromWorkOrder = useCallback(
    async (workOrderId: string) => {
      setLoading(true);
      setError(null);
      try {
        const pieceIds = await fetchWorkOrderPieceIds(workOrderId);
        if (pieceIds.length === 0) {
          setError('Work order sem peças associadas.');
          return;
        }

        const states = await Promise.all(pieceIds.map((id) => fetchOperatorPieceState(id)));
        const valid = states.filter((row): row is NonNullable<typeof row> => row !== null);

        if (mode === 'single' && valid[0]) {
          upsertPiece(toSessionPiece(valid[0], true));
          setSelectedPieceId(valid[0].pieceId);
        } else {
          upsertPieces(valid.map((state) => toSessionPiece(state, true)));
          setSelectedPieceIds(valid.map((row) => row.pieceId));
        }

        void refreshMessagesRef.current();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar work order.');
      } finally {
        setLoading(false);
      }
    },
    [mode, upsertPiece, upsertPieces],
  );

  const loadAllWorkOrderPieces = useCallback(async () => {
    let summaries = workOrderSummaries;
    if (summaries.length === 0) {
      summaries = await fetchOperatorWorkOrderSummaries(user?.id);
      setWorkOrderSummaries(summaries);
    }

    if (summaries.length === 0) {
      setError('Nenhum work order activo encontrado.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const pieceIds = Array.from(
        new Set(summaries.flatMap((summary) => summary.tasks.map((task) => task.pieceId))),
      );
      const states = await Promise.all(pieceIds.map((id) => fetchOperatorPieceState(id)));
      const valid = states.filter((row): row is NonNullable<typeof row> => row !== null);

      if (mode === 'batch') {
        upsertPieces(valid.map((state) => toSessionPiece(state, true)));
        setSelectedPieceIds(valid.map((row) => row.pieceId));
      } else if (valid[0]) {
        upsertPiece(toSessionPiece(valid[0], true));
        setSelectedPieceId(valid[0].pieceId);
      }

      void refreshMessagesRef.current();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar peças dos work orders.');
    } finally {
      setLoading(false);
    }
  }, [mode, upsertPiece, upsertPieces, user?.id, workOrderSummaries]);

  const selectPiece = useCallback((pieceId: string) => {
    setSelectedPieceId(pieceId);
    setPieces((prev) => prev.map((row) => ({ ...row, selected: row.pieceId === pieceId })));
  }, []);

  const togglePieceSelection = useCallback((pieceId: string) => {
    setSelectedPieceIds((prev) =>
      prev.includes(pieceId) ? prev.filter((id) => id !== pieceId) : [...prev, pieceId],
    );
    setPieces((prev) =>
      prev.map((row) => (row.pieceId === pieceId ? { ...row, selected: !row.selected } : row)),
    );
  }, []);

  const selectAllPieces = useCallback(() => {
    const ids = pieces.map((row) => row.pieceId);
    setSelectedPieceIds(ids);
    setPieces((prev) => prev.map((row) => ({ ...row, selected: true })));
  }, [pieces]);

  const clearSelection = useCallback(() => {
    setSelectedPieceIds([]);
    setSelectedPieceId(null);
    setPieces((prev) => prev.map((row) => ({ ...row, selected: false })));
  }, []);

  const removePiece = useCallback((pieceId: string) => {
    setPieces((prev) => prev.filter((row) => row.pieceId !== pieceId));
    setSelectedPieceIds((prev) => prev.filter((id) => id !== pieceId));
    setSelectedPieceId((prev) => (prev === pieceId ? null : prev));
  }, []);

  const clearSession = useCallback(() => {
    setPieces([]);
    setSelectedPieceId(null);
    setSelectedPieceIds([]);
    setCodeInput('');
    setBatchInput('');
    setError(null);
  }, []);

  const refreshPiece = useCallback(
    async (pieceId: string) => {
      const state = await fetchOperatorPieceState(pieceId);
      if (!state) return;
      upsertPiece(
        toSessionPiece(state, selectedPieceIds.includes(pieceId) || selectedPieceId === pieceId),
      );
    },
    [selectedPieceId, selectedPieceIds, upsertPiece],
  );

  const refreshAllPieces = useCallback(async () => {
    if (pieces.length === 0) return;
    await Promise.all(pieces.map((piece) => refreshPiece(piece.pieceId)));
  }, [pieces, refreshPiece]);

  refreshAllPiecesRef.current = refreshAllPieces;

  const executeOperation = useCallback(
    async (operationType: ProjetosPieceOperationId, action: 'start' | 'complete' = 'start') => {
      const targetIds =
        mode === 'batch'
          ? selectedPieceIds.length > 0
            ? selectedPieceIds
            : pieces.map((row) => row.pieceId)
          : selectedPieceId
            ? [selectedPieceId]
            : pieces.length === 1
              ? [pieces[0]!.pieceId]
              : [];

      if (targetIds.length === 0) {
        setError(mode === 'batch' ? 'Seleccione peças para aplicar a operação.' : 'Carregue uma peça na sessão.');
        return;
      }

      setExecutingOperation(operationType);
      setError(null);
      try {
        const logs = await recordOperatorOperation({
          pieceIds: targetIds,
          operationType,
          action,
          operatorId: user?.id,
          operatorSession,
        });

        setOperationsLog((prev) => [...logs, ...prev].slice(0, MAX_LOG));
        await Promise.all(targetIds.map((pieceId) => refreshPiece(pieceId)));
        void refreshMessagesRef.current();
        void refreshWorkOrdersRef.current();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao registar operação.');
      } finally {
        setExecutingOperation(null);
      }
    },
    [mode, operatorSession, pieces, refreshPiece, selectedPieceId, selectedPieceIds, user?.id],
  );

  useEffect(() => {
    void refreshWorkOrders();
    void refreshMessages();
  }, [refreshMessages, refreshWorkOrders]);

  useEffect(() => {
    void refreshMessages();
  }, [pieces.length, refreshMessages]);

  const sessionStats = useMemo(
    () => ({
      pieceCount: pieces.length,
      operationCount: operationsLog.length,
    }),
    [operationsLog.length, pieces.length],
  );

  const mergedMessages = useMemo(() => {
    const fromRealtime = realtime.realtimeNotifications.map((note) => ({
      id: note.id,
      title: note.title,
      body: note.message,
      createdAt: note.createdAt,
      assignedOperatorId: user?.id ?? null,
    }));
    const seen = new Set<string>();
    return [...fromRealtime, ...messages].filter((msg) => {
      if (seen.has(msg.id)) return false;
      seen.add(msg.id);
      return true;
    });
  }, [messages, realtime.realtimeNotifications, user?.id]);

  return {
    mode,
    pieces,
    selectedPieceId,
    selectedPieceIds,
    operationsLog,
    messages: mergedMessages,
    workOrderSummaries,
    loading,
    loadingWorkOrders,
    error,
    codeInput,
    batchInput,
    operatorSession,
    executingOperation,
    realtimeConnected: realtime.connected,
    sessionStats,
    setMode,
    setCodeInput,
    setBatchInput,
    loadSingleCode,
    loadBatchCodes,
    loadFromWorkOrder,
    loadAllWorkOrderPieces,
    refreshWorkOrders,
    refreshMessages,
    selectPiece,
    togglePieceSelection,
    selectAllPieces,
    clearSelection,
    removePiece,
    clearSession,
    executeOperation,
    refreshPiece,
    refreshAllPieces,
  };
}

export type UseOperatorPageReturnExtended = ReturnType<typeof useOperatorPage>;
