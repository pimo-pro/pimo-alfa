import { INDUSTRIAL_ROLES } from '@/industrial/core/permissions/roles';

export const industrialSettingsPermissions = {
  view: [INDUSTRIAL_ROLES.admin, INDUSTRIAL_ROLES.operador, INDUSTRIAL_ROLES.manager],
  edit: [INDUSTRIAL_ROLES.admin],
} as const;
