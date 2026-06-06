import { INDUSTRIAL_ROLES } from '@/industrial/core/permissions/roles';

export const industrialAdminPermissions = {
  canView: [INDUSTRIAL_ROLES.admin, INDUSTRIAL_ROLES.operador, INDUSTRIAL_ROLES.manager],
  canEdit: [INDUSTRIAL_ROLES.admin],
  canPublish: [INDUSTRIAL_ROLES.admin],
} as const;
