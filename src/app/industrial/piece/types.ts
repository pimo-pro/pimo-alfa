import type { RematePiece } from '@/core/remate/remateTypes';
import type { ProjectRodape } from '@/core/rodape/rodapeTypes';
import type { IndustrialSystemEvent } from '@/industrial/infra/supabase/events';
import type { PieceOperation } from '@/industrial/core/piece-operations/types';
import type { IndustrialPiece } from '@/industrial/core/pieces/types';
import type { QualityInspection } from '@/industrial/core/quality/types';
import type { ReworkRequest } from '@/industrial/core/rework/types';
import type { TimeTrackingEntry } from '@/industrial/core/time-tracking/types';
import type { TrackingSnapshot } from '@/industrial/core/tracking/types';
import type { TrackingAction } from '@/industrial/persistence/tracking/updateTrackingState';
import type { QualityDecision } from '@/industrial/core/quality/types';

export type PieceSelectableType = 'piece' | 'remate' | 'rodape';

export interface PieceSelection {
  id: string;
  type: PieceSelectableType;
}

export interface EntityTransform {
  position: [number, number, number];
  rotation: [number, number, number];
}

export type PieceTransformMap = Record<string, EntityTransform>;

export type PieceToolMode = 'select' | 'move' | 'rotate';

export interface PieceSceneEntity {
  id: string;
  type: PieceSelectableType;
  label: string;
  widthM: number;
  heightM: number;
  depthM: number;
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface PieceDataState {
  piece: IndustrialPiece | null;
  operations: PieceOperation[];
  tracking: TrackingSnapshot | null;
  events: IndustrialSystemEvent[];
  quality: QualityInspection[];
  rework: ReworkRequest[];
  timeEntries: TimeTrackingEntry[];
  remates: RematePiece[];
  rodapes: ProjectRodape[];
  persistedTransforms: PieceTransformMap;
  projectId?: string;
  projectName?: string;
  boxName?: string;
  qrPayload: string;
  loading: boolean;
  error: string | null;
  saving: boolean;
  reload: () => void;
  runTrackingAction: (operationId: string, action: TrackingAction, reason?: string) => Promise<void>;
  runQualityDecision: (decision: QualityDecision, reason?: string) => Promise<void>;
  startTime: (operationId?: string) => Promise<void>;
  stopTime: () => Promise<void>;
}
