/**
 * Chaves de permissão alinhadas com `pimo_role_permissions_map()` em `api/auth/index.php`.
 *
 * Roles no backend (cada uma com a lista indicada):
 * - admin: admin.full_access, project.view.all, project.edit.self, user.manage.below
 * - ultra+: project.view.factory, user.manage.below, project.edit.self
 * - ultra: project.edit.self, project.view.self, project.send_to_production.self
 * - pro: project.edit.self, project.view.self
 * - visitor: project.view.self
 *
 * Futuro (Fase 5 / global settings): podem acrescentar chaves como `settings.global.read`
 * sem alterar o contrato JWT — apenas o mapa PHP e esta lista.
 */
export const PERMISSIONS = {
  ADMIN_FULL_ACCESS: "admin.full_access",
  PROJECT_VIEW_ALL: "project.view.all",
  PROJECT_VIEW_FACTORY: "project.view.factory",
  PROJECT_VIEW_SELF: "project.view.self",
  PROJECT_EDIT_SELF: "project.edit.self",
  PROJECT_SEND_TO_PRODUCTION_SELF: "project.send_to_production.self",
  USER_MANAGE_BELOW: "user.manage.below",
} as const;

export type PermissionId = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Lista única de permissões conhecidas no produto (documentação / testes). */
export const ALL_KNOWN_PERMISSIONS: readonly PermissionId[] = [
  PERMISSIONS.ADMIN_FULL_ACCESS,
  PERMISSIONS.PROJECT_VIEW_ALL,
  PERMISSIONS.PROJECT_VIEW_FACTORY,
  PERMISSIONS.PROJECT_VIEW_SELF,
  PERMISSIONS.PROJECT_EDIT_SELF,
  PERMISSIONS.PROJECT_SEND_TO_PRODUCTION_SELF,
  PERMISSIONS.USER_MANAGE_BELOW,
];
