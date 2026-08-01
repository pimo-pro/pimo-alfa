import type { IndustrialStation, IndustrialWorkOrderTask } from '@/industrial/work-orders/types';

export type StationToolMode = 'select' | 'move' | 'rotate';

export interface StationListItem {
  id: string;
  primary: string;
  secondary?: string;
  pieceId?: string;
  /** ID da tarefa WO — permite checkbox / selecção em grupo. */
  taskId?: string;
  status?: IndustrialWorkOrderTask['status'];
}

export type StationBulkAction = 'start' | 'complete' | 'reject';

export interface StationActionFeedback {
  ok: boolean;
  message: string;
}

export interface StationListSection {
  title: string;
  items: StationListItem[];
}

export interface StationNotification {
  id: string;
  type: 'task' | 'quality' | 'time' | 'supervisor';
  title: string;
  message: string;
  createdAt: string;
}

export interface StationChatMessage {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  eventAttachment?: string;
}

export interface StationChatConversation {
  id: string;
  title: string;
  messages: StationChatMessage[];
}

export interface StationPageConfig {
  station: IndustrialStation;
  panelTitle: string;
  confirmLabel: string;
  rejectLabel?: string;
  enableSupervisorChat?: boolean;
}
