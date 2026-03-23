import { useMemo } from "react";
import { saveProfiles } from "../../core/rules/rulesProfilesStorage";
import { DEFAULT_PROFILE_ID } from "../../core/rules/rulesProfilesStorage";
import { defaultRulesConfig, normalizeRulesConfig, type RulesConfig } from "../../core/rules/rulesConfig";
import type { RulesProfile, RulesProfilesConfig } from "../../core/rules/rulesProfiles";
import type { ProjectActions } from "../projectTypes";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";

export type RulesActions = Pick<
  ProjectActions,
  | "updateRules"
  | "setActiveRulesProfile"
  | "updateRulesInProfile"
  | "addRulesProfile"
  | "setRulesProfilesConfig"
  | "setProjectRulesProfile"
  | "removeRulesProfile"
>;

export function useRulesActions(ctx: ProjectActionsExecutionContext): RulesActions {
  const { updateProject, applyResultados } = ctx;

  return useMemo(() => {
    const a = {} as RulesActions;

    a.updateRules = (rules: RulesConfig) => {
      updateProject((prev) => {
        const normalizedRules = normalizeRulesConfig(rules);
        const profiles = prev.rulesProfiles;
        const idx = profiles.perfis.findIndex((p) => p.id === profiles.perfilAtivoId);
        if (idx < 0) return { ...prev, rules: normalizedRules };
        const nextPerfis = [...profiles.perfis];
        nextPerfis[idx] = { ...nextPerfis[idx], rules: normalizedRules };
        const nextConfig = { ...profiles, perfis: nextPerfis };
        saveProfiles(nextConfig);
        return applyResultados({ ...prev, rulesProfiles: nextConfig, rules: normalizedRules });
      }, true);
    };

    a.setActiveRulesProfile = (id: string) => {
      updateProject((prev) => {
        const profiles = prev.rulesProfiles;
        if (!profiles.perfis.some((p) => p.id === id)) return prev;
        const nextConfig = { ...profiles, perfilAtivoId: id };
        const perfil = nextConfig.perfis.find((p) => p.id === id);
        const rules = normalizeRulesConfig(perfil?.rules ?? prev.rules);
        saveProfiles(nextConfig);
        return applyResultados({ ...prev, rulesProfiles: nextConfig, rules });
      }, true);
    };

    a.updateRulesInProfile = (profileId: string, rules: RulesConfig) => {
      updateProject((prev) => {
        const normalizedRules = normalizeRulesConfig(rules);
        const profiles = prev.rulesProfiles;
        const idx = profiles.perfis.findIndex((p) => p.id === profileId);
        if (idx < 0) return prev;
        const nextPerfis = [...profiles.perfis];
        nextPerfis[idx] = { ...nextPerfis[idx], rules: normalizedRules };
        const nextConfig = { ...profiles, perfis: nextPerfis };
        const isActive = profiles.perfilAtivoId === profileId;
        const nextRules = isActive ? normalizedRules : prev.rules;
        saveProfiles(nextConfig);
        return applyResultados({ ...prev, rulesProfiles: nextConfig, rules: nextRules });
      }, true);
    };

    a.addRulesProfile = (profile: { nome: string; descricao?: string; rules?: RulesConfig }) => {
      updateProject((prev) => {
        const id = `profile-${Date.now()}`;
        const newProfile: RulesProfile = {
          id,
          nome: profile.nome,
          descricao: profile.descricao,
          rules: normalizeRulesConfig(profile.rules ?? JSON.parse(JSON.stringify(defaultRulesConfig))),
        };
        const nextConfig = {
          ...prev.rulesProfiles,
          perfis: [...prev.rulesProfiles.perfis, newProfile],
        };
        saveProfiles(nextConfig);
        return { ...prev, rulesProfiles: nextConfig };
      }, true);
    };

    a.setRulesProfilesConfig = (config: RulesProfilesConfig) => {
      updateProject((prev) => {
        const perfil = config.perfis.find((p) => p.id === config.perfilAtivoId);
        const normalizedConfig: RulesProfilesConfig = {
          ...config,
          perfis: config.perfis.map((p) => ({ ...p, rules: normalizeRulesConfig(p.rules) })),
        };
        const normalizedActive = normalizedConfig.perfis.find((p) => p.id === normalizedConfig.perfilAtivoId);
        const rules = normalizeRulesConfig(normalizedActive?.rules ?? perfil?.rules ?? prev.rules);
        return applyResultados({ ...prev, rulesProfiles: normalizedConfig, rules });
      }, true);
    };

    a.setProjectRulesProfile = (id: string) => {
      updateProject((prev) => {
        const perfil = prev.rulesProfiles.perfis.find((p) => p.id === id);
        if (!perfil) return prev;
        return applyResultados({
          ...prev,
          rulesProfileId: id,
          rules: normalizeRulesConfig(perfil.rules),
        });
      }, true);
    };

    a.removeRulesProfile = (id: string) => {
      if (id === DEFAULT_PROFILE_ID) return;
      updateProject((prev) => {
        const profiles = prev.rulesProfiles;
        const nextPerfis = profiles.perfis.filter((p) => p.id !== id);
        if (nextPerfis.length === 0) return prev;
        const newActiveId = profiles.perfilAtivoId === id ? nextPerfis[0].id : profiles.perfilAtivoId;
        const nextConfig = {
          perfis: nextPerfis,
          perfilAtivoId: newActiveId,
        };
        const perfil = nextPerfis.find((p) => p.id === newActiveId);
        const rules = normalizeRulesConfig(perfil?.rules ?? prev.rules);
        saveProfiles(nextConfig);
        return applyResultados({ ...prev, rulesProfiles: nextConfig, rules });
      }, true);
    };

    return a;
  }, [updateProject, applyResultados]);
}
