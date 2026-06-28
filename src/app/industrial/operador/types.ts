import type { OperatorPieceState, OperatorOperationLogEntry, OperatorReadMode } from '@/industrial/operador/types';
import type { ProjetosPieceOperationId } from '@/industrial/integration/projetos/types';
import type { OperatorIndustrialMessage, OperatorWorkOrderSummary } from '@/industrial/api/operatorActions';

export type OperatorSessionPiece = OperatorPieceState & {
  selected: boolean;
};

export type OperatorWorkOrderMessage = OperatorIndustrialMessage;

export type OperatorPageState = {
  mode: OperatorReadMode;
  pieces: OperatorSessionPiece[];
  selectedPieceId: string | null;
  selectedPieceIds: string[];
  operationsLog: OperatorOperationLogEntry[];
  messages: OperatorWorkOrderMessage[];
  workOrderSummaries: OperatorWorkOrderSummary[];
  loading: boolean;
  loadingWorkOrders: boolean;
  error: string | null;
  codeInput: string;
  batchInput: string;
  operatorSession: string;
  executingOperation: ProjetosPieceOperationId | null;
  realtimeConnected: boolean;
  sessionStats: {
    pieceCount: number;
    operationCount: number;
  };
};

export type OperatorPageActions = {
  setMode: (mode: OperatorReadMode) => void;
  setCodeInput: (value: string) => void;
  setBatchInput: (value: string) => void;
  loadSingleCode: (code?: string) => Promise<void>;
  loadBatchCodes: (raw?: string) => Promise<void>;
  loadFromWorkOrder: (workOrderId: string) => Promise<void>;
  loadAllWorkOrderPieces: () => Promise<void>;
  refreshWorkOrders: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  selectPiece: (pieceId: string) => void;
  togglePieceSelection: (pieceId: string) => void;
  selectAllPieces: () => void;
  clearSelection: () => void;
  removePiece: (pieceId: string) => void;
  clearSession: () => void;
  executeOperation: (operationType: ProjetosPieceOperationId, action?: 'start' | 'complete') => Promise<void>;
  refreshPiece: (pieceId: string) => Promise<void>;
  refreshAllPieces: () => Promise<void>;
};

export type UseOperatorPageReturn = OperatorPageState & OperatorPageActions;
