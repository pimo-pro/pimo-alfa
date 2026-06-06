import { INDUSTRIAL_ROLES, type IndustrialRole } from './roles';

export interface IndustrialUser {
  id: string;
  role: IndustrialRole | string;
  departmentId?: string | null;
}

export interface IndustrialTask {
  id: string;
  departmentId?: string | null;
  createdBy?: string | null;
  acceptedBy?: string | null;
}

export interface IndustrialDepartment {
  id: string;
}

export interface IndustrialProject {
  id: string;
  departmentId?: string | null;
}

export interface IndustrialUserPermissions {
  canViewTasks?: boolean;
  canViewDepartments?: boolean;
  canViewProjects?: boolean;
  canViewAnalytics?: boolean;
  canManageUsers?: boolean;
  canManageDepartments?: boolean;
  canAccessAdminPanel?: boolean;
  canEditAllTasks?: boolean;
  canCreateTasks?: boolean;
  canDeleteTasks?: boolean;
  canManageSettings?: boolean;
  canEditDepartmentTasks?: boolean;
  canAssignTasks?: boolean;
  canManageDepartment?: boolean;
  canCreateOwnTasks?: boolean;
  canEditOwnTasks?: boolean;
  canAcceptTasks?: boolean;
  canCompleteTasks?: boolean;
}

export function canViewTask(user: IndustrialUser | null, task: IndustrialTask): boolean {
  if (!user) return false;
  if (user.role === INDUSTRIAL_ROLES.admin) return true;

  if (user.role === INDUSTRIAL_ROLES.manager || user.role === INDUSTRIAL_ROLES.operador) {
    return user.departmentId === task.departmentId;
  }

  if (user.role === INDUSTRIAL_ROLES.worker) {
    return task.createdBy === user.id || task.acceptedBy === user.id;
  }

  return false;
}

export function canEditTask(user: IndustrialUser | null, task: IndustrialTask): boolean {
  if (!user) return false;
  if (user.role === INDUSTRIAL_ROLES.admin) return true;

  if (user.role === INDUSTRIAL_ROLES.manager || user.role === INDUSTRIAL_ROLES.operador) {
    return user.departmentId === task.departmentId;
  }

  if (user.role === INDUSTRIAL_ROLES.worker) {
    return task.createdBy === user.id;
  }

  return false;
}

export function canViewDepartment(user: IndustrialUser | null, departmentId: string): boolean {
  if (!user) return false;
  if (user.role === INDUSTRIAL_ROLES.admin) return true;

  if (
    user.role === INDUSTRIAL_ROLES.manager ||
    user.role === INDUSTRIAL_ROLES.operador ||
    user.role === INDUSTRIAL_ROLES.worker
  ) {
    return user.departmentId === departmentId;
  }

  return false;
}

export function canViewProject(user: IndustrialUser | null, _project: IndustrialProject): boolean {
  if (!user) return false;
  if (user.role === INDUSTRIAL_ROLES.admin) return true;
  if (user.role === INDUSTRIAL_ROLES.manager) return true;
  if (user.role === INDUSTRIAL_ROLES.worker) return true;
  return false;
}

export function isAdmin(user: IndustrialUser | null): boolean {
  return user?.role === INDUSTRIAL_ROLES.admin;
}

export function isManager(user: IndustrialUser | null): boolean {
  return user?.role === INDUSTRIAL_ROLES.manager;
}

export function isWorker(user: IndustrialUser | null): boolean {
  return user?.role === INDUSTRIAL_ROLES.worker;
}

export function canManageUsers(user: IndustrialUser | null): boolean {
  return isAdmin(user) || isManager(user) || user?.role === INDUSTRIAL_ROLES.operador;
}

export function canManageDepartments(user: IndustrialUser | null): boolean {
  return isAdmin(user);
}

export function canViewAnalytics(user: IndustrialUser | null): boolean {
  return isAdmin(user) || isManager(user);
}

export function canAccessAdminPanel(user: IndustrialUser | null): boolean {
  return isAdmin(user);
}

/**
 * Calcula o conjunto RBAC agregado usado por UI, actions e guards industriais.
 */
export function getUserPermissions(user: IndustrialUser | null): IndustrialUserPermissions {
  if (!user) return {};

  const basePermissions: IndustrialUserPermissions = {
    canViewTasks: true,
    canViewDepartments: true,
    canViewProjects: true,
    canViewAnalytics: canViewAnalytics(user),
    canManageUsers: canManageUsers(user),
    canManageDepartments: canManageDepartments(user),
    canAccessAdminPanel: canAccessAdminPanel(user),
  };

  if (user.role === INDUSTRIAL_ROLES.admin) {
    return {
      ...basePermissions,
      canEditAllTasks: true,
      canCreateTasks: true,
      canDeleteTasks: true,
      canManageSettings: true,
    };
  }

  if (user.role === INDUSTRIAL_ROLES.manager || user.role === INDUSTRIAL_ROLES.operador) {
    return {
      ...basePermissions,
      canEditDepartmentTasks: true,
      canCreateTasks: true,
      canAssignTasks: true,
      canManageDepartment: true,
    };
  }

  if (user.role === INDUSTRIAL_ROLES.worker) {
    return {
      ...basePermissions,
      canCreateOwnTasks: true,
      canEditOwnTasks: true,
      canAcceptTasks: true,
      canCompleteTasks: true,
    };
  }

  return basePermissions;
}
