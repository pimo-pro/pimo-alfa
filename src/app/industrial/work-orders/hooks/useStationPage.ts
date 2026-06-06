import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { useAuth } from '@/auth/useAuth';
import { parseBarcode } from '@/industrial/core/barcode/actions';
import {
  assignOperator,
  fetchStationTasks,
  fetchWorkOrders,
  finishTask,
  logTaskEvent,
  rejectTask,
} from '@/industrial/api/workOrderActions';
import type { IndustrialStation, IndustrialWorkOrder, IndustrialWorkOrderTask } from '@/industrial/work-orders/types';
import type {
  StationChatConversation,
  StationNotification,
  StationToolMode,
} from '@/industrial/ui/components/stationTypes';
import { useIndustrialPageState } from '@/industrial/ui/components';

import { buildCanvasPieces, buildStationListSections } from '../utils/stationListData';
import { getStationConfig, getStationPageTitle } from '../stationConfigs';

function buildNotifications(
  _station: IndustrialStation,
  tasks: IndustrialWorkOrderTask[],
  enableSupervisor: boolean,
): StationNotification[] {
  const now = new Date().toISOString();
  const notes: StationNotification[] = [];
  const pending = tasks.filter((t) => t.status === 'pending');
  const running = tasks.filter((t) => t.status === 'in_progress');
  const rejected = tasks.filter((t) => t.status === 'rejected');

  if (pending.length > 0) {
    notes.push({
      id: 'task-pending',
      type: 'task',
      title: 'Tarefas pendentes',
      message: `${pending.length} tarefa(s) aguardam execução.`,
      createdAt: now,
    });
  }

  if (rejected.length > 0) {
    notes.push({
      id: 'quality-rejected',
      type: 'quality',
      title: 'Qualidade',
      message: `${rejected.length} tarefa(s) rejeitada(s).`,
      createdAt: now,
    });
  }

  if (running.length > 0) {
    notes.push({
      id: 'time-running',
      type: 'time',
      title: 'Tempo activo',
      message: `${running.length} operação(ões) em curso.`,
      createdAt: now,
    });
  }

  if (enableSupervisor) {
    notes.push({
      id: 'supervisor',
      type: 'supervisor',
      title: 'Supervisor disponível',
      message: 'Canal de chat activo para apoio de montagem.',
      createdAt: now,
    });
  }

  return notes;
}

function initialConversations(station: IndustrialStation, enableSupervisor: boolean): StationChatConversation[] {
  const base: StationChatConversation[] = [
    {
      id: 'station',
      title: 'Estação',
      messages: [
        {
          id: 'welcome',
          author: 'Sistema',
          body: `Estação ${station} pronta para execução.`,
          createdAt: new Date().toISOString(),
        },
      ],
    },
  ];

  if (enableSupervisor) {
    base.push({
      id: 'supervisor',
      title: 'Supervisor',
      messages: [
        {
          id: 'sup-welcome',
          author: 'Supervisor',
          body: 'Disponível para apoio na montagem.',
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }

  return base;
}

export function useStationPage(station: IndustrialStation) {
  useIndustrialPageState();
  const { user } = useAuth();
  const config = getStationConfig(station);

  const [orders, setOrders] = useState<IndustrialWorkOrder[]>([]);
  const [tasks, setTasks] = useState<IndustrialWorkOrderTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [selectedTask, setSelectedTask] = useState<IndustrialWorkOrderTask | null>(null);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toolMode, setToolMode] = useState<StationToolMode>('select');
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(config.enableSupervisorChat ?? false);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [conversations, setConversations] = useState<StationChatConversation[]>(() =>
    initialConversations(station, config.enableSupervisorChat ?? false),
  );
  const [activeConversationId, setActiveConversationId] = useState(
    config.enableSupervisorChat ? 'supervisor' : 'station',
  );
  const [eventLog, setEventLog] = useState<Array<{ id: string; type: string; at: string }>>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderRows, taskRows] = await Promise.all([
        fetchWorkOrders({ station }),
        fetchStationTasks(station),
      ]);
      setOrders(orderRows);
      setTasks(taskRows);
      setSelectedTask((current) => {
        if (!current) return null;
        return taskRows.find((t) => t.id === current.id) ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estação.');
    } finally {
      setLoading(false);
    }
  }, [station]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress'),
    [tasks],
  );

  const sections = useMemo(
    () => buildStationListSections(station, tasks, orders),
    [station, tasks, orders],
  );

  const canvasPieces = useMemo(
    () => buildCanvasPieces(tasks, orders, selectedPieceId),
    [tasks, orders, selectedPieceId],
  );

  const notifications = useMemo(() => {
    const all = buildNotifications(station, tasks, config.enableSupervisorChat ?? false);
    return all.filter((n) => !dismissedNotifications.includes(n.id));
  }, [station, tasks, config.enableSupervisorChat, dismissedNotifications]);

  const resolveTaskFromCode = useCallback(
    (raw: string): IndustrialWorkOrderTask | null => {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      const parsed = parseBarcode(trimmed);
      const pieceId = parsed?.entityType === 'piece' ? parsed.id : trimmed;
      return (
        activeTasks.find((t) => t.pieceId === pieceId) ??
        activeTasks.find((t) => t.pieceId.includes(pieceId) || pieceId.includes(t.pieceId)) ??
        null
      );
    },
    [activeTasks],
  );

  const selectTask = useCallback(
    (task: IndustrialWorkOrderTask | null) => {
      setSelectedTask(task);
      setSelectedPieceId(task?.pieceId ?? null);
      if (task && user?.id) {
        void assignOperator(task.id, user.id).catch(() => undefined);
      }
    },
    [user?.id],
  );

  const handleCodeSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      setError(null);
      const match = resolveTaskFromCode(codeInput);
      if (!match) {
        setError('Nenhuma tarefa activa encontrada para este código.');
        return;
      }
      selectTask(match);
    },
    [codeInput, resolveTaskFromCode, selectTask],
  );

  const handleConfirm = useCallback(async () => {
    if (!selectedTask) {
      setError('Seleccione uma tarefa via QR/código.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await finishTask(selectedTask.id, user?.id);
      await logTaskEvent(selectedTask.id, 'station_confirmed', { station }, user?.id);
      setEventLog((prev) => [
        { id: `${Date.now()}`, type: `confirmed:${selectedTask.pieceId}`, at: new Date().toISOString() },
        ...prev,
      ]);
      setCodeInput('');
      selectTask(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao confirmar execução.');
    } finally {
      setBusy(false);
    }
  }, [selectedTask, user?.id, station, selectTask, reload]);

  const handleReject = useCallback(async () => {
    if (!selectedTask) return;
    setBusy(true);
    setError(null);
    try {
      await rejectTask(selectedTask.id, 'Rejeitado na estação', user?.id);
      setCodeInput('');
      selectTask(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao rejeitar.');
    } finally {
      setBusy(false);
    }
  }, [selectedTask, user?.id, selectTask, reload]);

  const handleSendChatMessage = useCallback(
    (body: string, eventAttachment?: string) => {
      const convId = activeConversationId;
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === convId
            ? {
                ...conv,
                messages: [
                  ...conv.messages,
                  {
                    id: `${Date.now()}`,
                    author: user?.id ?? 'Operador',
                    body,
                    createdAt: new Date().toISOString(),
                    eventAttachment,
                  },
                ],
              }
            : conv,
        ),
      );
      if (selectedTask && eventAttachment) {
        void logTaskEvent(selectedTask.id, 'chat_event', { event: eventAttachment }, user?.id);
      }
    },
    [activeConversationId, selectedTask, user?.id],
  );

  return {
    config,
    title: getStationPageTitle(station),
    description: loading
      ? 'A carregar fila de trabalho…'
      : `${activeTasks.length} tarefa(s) activa(s) · ${orders.length} ordem(ns)`,
    loading,
    busy,
    error,
    codeInput,
    setCodeInput,
    selectedTask,
    selectedPieceId,
    setSelectedPieceId,
    sidebarOpen,
    setSidebarOpen,
    toolMode,
    setToolMode,
    snapEnabled,
    setSnapEnabled,
    notificationsOpen,
    setNotificationsOpen,
    chatOpen,
    setChatOpen,
    notifications,
    dismissedNotifications,
    setDismissedNotifications,
    conversations,
    activeConversationId,
    setActiveConversationId,
    sections,
    canvasPieces,
    eventLog,
    tasks,
    orders,
    handleCodeSubmit,
    handleConfirm,
    handleReject,
    handleSendChatMessage,
    reload,
    selectTask,
  };
}
