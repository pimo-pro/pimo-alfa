import { WORK_ORDER_STATUSES } from '@/industrial/core/workflow-engine/work_order_statuses';

export const industrialRulesConfig = {
  defaultInitialStatus: WORK_ORDER_STATUSES.draft,
  defaultFinalStatus: WORK_ORDER_STATUSES.completed,
  allowManualTransitions: true,
} as const;
