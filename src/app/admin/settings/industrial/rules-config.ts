import { WORK_ORDER_STATUSES } from '@/industrial/core/workflow-engine/work_order_statuses';

export const industrialAdminRulesConfig = {
  initialStatus: WORK_ORDER_STATUSES.draft,
  completionStatus: WORK_ORDER_STATUSES.completed,
  allowManualTransitions: true,
  validatePermissionsBeforeTransition: true,
} as const;
