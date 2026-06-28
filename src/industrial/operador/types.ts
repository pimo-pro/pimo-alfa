import type { ProjetosPieceOperationId } from '@/industrial/integration/projetos/types';
import type { TrackingSnapshot } from '@/industrial/core/tracking/types';
import type { IndustrialWorkOrderTask } from '@/industrial/work-orders/types';
import type { PieceOperationRecord } from '@/industrial/persistence/shared/types';

import type { OperatorSessionId } from './constants';

export type OperatorReadMode = 'single' | 'batch';

export type OperatorPieceLookupResult = {
  pieceId: string;
  projectId: string;
  projectName: string;
  boxId?: string;
  boxName?: string;
  pieceName?: string;
  etiquetaCode?: string | null;
  qrPayload?: string | null;
  projectPageSlug?: string;
  boxSlug?: string;
  pieceSlug?: string;
};

export type OperatorPieceState = OperatorPieceLookupResult & {
  tasks: IndustrialWorkOrderTask[];
  tracking: TrackingSnapshot | null;
  operations: PieceOperationRecord[];
};

export type OperatorOperationLogEntry = {
  id: string;
  pieceId: string;
  nqrCode?: string | null;
  operationType: ProjetosPieceOperationId;
  action: 'start' | 'complete';
  operatorSession: OperatorSessionId;
  workOrderId?: string;
  notes?: string;
  timestamp: string;
};

export type RecordOperatorOperationInput = {
  pieceIds: string[];
  operationType: ProjetosPieceOperationId;
  action: 'start' | 'complete';
  operatorId?: string;
  operatorSession?: OperatorSessionId;
  notes?: string;
};
