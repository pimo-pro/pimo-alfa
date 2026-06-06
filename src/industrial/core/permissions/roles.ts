export const INDUSTRIAL_ROLES = {
  admin: 'admin',
  operador: 'operador',
  manager: 'manager',
  worker: 'worker',
  guest: 'guest',
} as const;

export type IndustrialRole = (typeof INDUSTRIAL_ROLES)[keyof typeof INDUSTRIAL_ROLES];

export function isAdminRole(role: string | null | undefined): boolean {
  return role === INDUSTRIAL_ROLES.admin;
}

export function isOperadorRole(role: string | null | undefined): boolean {
  return role === INDUSTRIAL_ROLES.operador;
}

export function isManagerRole(role: string | null | undefined): boolean {
  return role === INDUSTRIAL_ROLES.manager;
}

export function isWorkerRole(role: string | null | undefined): boolean {
  return role === INDUSTRIAL_ROLES.worker;
}

export function isGuestRole(role: string | null | undefined): boolean {
  return role === INDUSTRIAL_ROLES.guest;
}

/**
 * Verifica se o papel do utilizador esta na lista permitida pelo RBAC industrial.
 */
export function hasIndustrialAccess(
  userRole: string | null | undefined,
  allowedRoles: readonly (IndustrialRole | string)[],
): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

export const INDUSTRIAL_ROUTE_ACCESS: Record<string, IndustrialRole[]> = {
  '/playground': [INDUSTRIAL_ROLES.admin],
  '/settings': [INDUSTRIAL_ROLES.admin],
  '/departments': [INDUSTRIAL_ROLES.admin, INDUSTRIAL_ROLES.operador, INDUSTRIAL_ROLES.manager],
  '/work-orders': [INDUSTRIAL_ROLES.admin, INDUSTRIAL_ROLES.operador, INDUSTRIAL_ROLES.manager],
  '/tasks': [INDUSTRIAL_ROLES.admin, INDUSTRIAL_ROLES.operador, INDUSTRIAL_ROLES.manager, INDUSTRIAL_ROLES.worker],
  '/quality': [INDUSTRIAL_ROLES.admin, INDUSTRIAL_ROLES.operador, INDUSTRIAL_ROLES.manager, INDUSTRIAL_ROLES.worker],
  '/events': [INDUSTRIAL_ROLES.admin, INDUSTRIAL_ROLES.operador, INDUSTRIAL_ROLES.manager, INDUSTRIAL_ROLES.worker],
  '/playground-public': [],
};

export const INDUSTRIAL_AUTH_REQUIRED_PATTERNS = [
  /^\/playground$/,
  /^\/settings/,
  /^\/departments/,
  /^\/work-orders/,
  /^\/tasks/,
  /^\/quality/,
  /^\/events/,
  /^\/dashboard/,
  /^\/users/,
  /^\/metrics/,
  /^\/admin/,
  /^\/view\//,
];
