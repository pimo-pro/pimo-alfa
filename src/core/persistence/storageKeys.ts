/**
 * Chaves de localStorage usadas pelo pimo-v3.
 * Centralizadas aqui para permitir limpeza seletiva (ex.: "novo projeto")
 * sem afetar outros dados do domínio.
 */

/** Projetos guardados (lista de snapshots). */
export const PIMO_PROJECTS_KEY = "pimo_saved_projects";

/** Backups manuais. */
export const PIMO_BACKUP_KEY = "pimo_manual_backups";

/** Autosave do projeto atual. */
export const PIMO_AUTOSAVE_KEY = "pimo_autosave";

/** Configurações do sistema. */
export const PIMO_SETTINGS_KEY = "pimo_system_settings_v1";

/** Regras de modelo. */
export const PIMO_RULES_KEY = "pimo_model_rules";

/** Config de regras (rules storage). */
export const PIMO_RULES_CONFIG_KEY = "pimo-rules-config-v1";

/** Perfis de regras. */
export const PIMO_RULES_PROFILES_KEY = "pimo-rules-profiles-v1";

/** Templates admin. */
export const PIMO_TEMPLATES_KEY = "pimo_admin_templates";

/** Materiais CRUD. */
export const PIMO_MATERIALS_CRUD_KEY = "pimo_materials_crud_v1";

/** Estado do sistema de materiais. */
export const PIMO_MATERIAL_SYSTEM_KEY = "pimo_material_system_v1";

/** Materiais admin. */
export const PIMO_ADMIN_MATERIALS_KEY = "pimo_admin_materials";

/** Ferragens. */
export const PIMO_FERRAGENS_KEY = "pimo_ferragens";

/** Log de deploy. */
export const PIMO_DEPLOY_LOG_KEY = "pimo-deploy-log-v1";

/** Config do label designer. */
export const PIMO_LABEL_DESIGNER_KEY = "pimo_label_designer_config";

/** Templates do label designer. */
export const PIMO_LABEL_DESIGNER_TEMPLATES_KEY = "pimo_label_designer_templates";

/** Tipos de componente. */
export const PIMO_COMPONENT_TYPES_KEY = "pimo_component_types";

/** Modelos CAD admin. */
export const PIMO_CAD_MODELS_KEY = "pimo_admin_cad_models";

/** Ferramentas industriais admin. */
export const PIMO_INDUSTRIAL_TOOLS_KEY = "pimo_admin_industrial_tools";

/** Aba ativa do painel admin. */
export const PIMO_ADMIN_ACTIVE_TAB_KEY = "pimo_admin_active_tab";

/** Roadmap do projeto. */
export const PIMO_ROADMAP_KEY = "pimo_project_roadmap";

/** Data de atualização do roadmap. */
export const PIMO_ROADMAP_UPDATED_AT_KEY = "pimo_project_roadmap_updated_at";

/** Prefixo das chaves de notas por projeto (pimo_project_notes:<nome>). */
export const PIMO_PROJECT_NOTES_PREFIX = "pimo_project_notes:";

/**
 * Lista de todas as chaves estáticas usadas pelo pimo-v3.
 * Usada por clearPimoStorage() para remoção seletiva.
 */
export const PIMO_STORAGE_KEYS: readonly string[] = [
  PIMO_PROJECTS_KEY,
  PIMO_BACKUP_KEY,
  PIMO_AUTOSAVE_KEY,
  PIMO_SETTINGS_KEY,
  PIMO_RULES_KEY,
  PIMO_RULES_CONFIG_KEY,
  PIMO_RULES_PROFILES_KEY,
  PIMO_TEMPLATES_KEY,
  PIMO_MATERIALS_CRUD_KEY,
  PIMO_MATERIAL_SYSTEM_KEY,
  PIMO_ADMIN_MATERIALS_KEY,
  PIMO_FERRAGENS_KEY,
  PIMO_DEPLOY_LOG_KEY,
  PIMO_LABEL_DESIGNER_KEY,
  PIMO_LABEL_DESIGNER_TEMPLATES_KEY,
  PIMO_COMPONENT_TYPES_KEY,
  PIMO_CAD_MODELS_KEY,
  PIMO_INDUSTRIAL_TOOLS_KEY,
  PIMO_ADMIN_ACTIVE_TAB_KEY,
  PIMO_ROADMAP_KEY,
  PIMO_ROADMAP_UPDATED_AT_KEY,
] as const;

/**
 * Remove apenas as chaves de localStorage usadas pelo pimo-v3.
 * Não afeta outros dados do domínio/host.
 */
export function clearPimoStorage(): void {
  if (typeof localStorage === "undefined") return;
  for (const key of PIMO_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key != null && key.startsWith(PIMO_PROJECT_NOTES_PREFIX)) keysToRemove.push(key);
  }
  for (const key of keysToRemove) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
