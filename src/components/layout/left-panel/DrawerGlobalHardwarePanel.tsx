import { useState } from "react";
import {
  createDefaultHardwareDraft,
  draftFromDrawer,
  drawerHardware,
  type DrawerHardwareDraft,
} from "../../../core/drawers/drawerHardware";
import {
  DRAWER_HANDLE_TYPES,
  DRAWER_METAL_BOX_TYPES,
  DRAWER_SLIDE_TYPES,
} from "../../../core/drawers/drawerUiConstants";
import {
  isMetalBoxCatalogType,
  listMetalBoxProfilesForType,
  pickCompatibleMetalDepth,
  resolveMetalBoxHeightMm,
  resolveMetalBoxProfile,
} from "../../../core/drawers/drawerMetalBoxCatalog";
import { getDefaultProfileForHandleType } from "../../../core/drawers/drawerHandleCatalog";
import { getSettings } from "../../../core/settings/settingsService";
import type {
  DrawerHandleType,
  DrawerMetalBoxType,
  DrawerSlideType,
} from "../../../core/settings/settingsSchema";
import type { DrawerLayerItem } from "../../../models/BoxLayers";

type DrawerGlobalHardwarePanelProps = {
  drawers: DrawerLayerItem[];
  onApply: (draft: DrawerHardwareDraft) => void;
};

/**
 * Selector de Ferragens global (mesmo layout dos campos individuais).
 * Ao confirmar, o parent aplica o draft a todas as gavetas do layer.
 */
export default function DrawerGlobalHardwarePanel({
  drawers,
  onApply,
}: DrawerGlobalHardwarePanelProps) {
  const settings = getSettings().gavetas;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DrawerHardwareDraft>(() =>
    createDefaultHardwareDraft(
      drawers[0]
        ? { ...draftFromDrawer(drawers[0]), slideType: drawerHardware.defaultSystem }
        : { slideType: drawerHardware.defaultSystem }
    )
  );

  const metalProfile = isMetalBoxCatalogType(draft.metalBoxType)
    ? resolveMetalBoxProfile(
        draft.metalBoxType,
        draft.metalBoxProfileId,
        draft.metalBoxHeightMm
      )
    : null;
  const depthOptions = metalProfile
    ? metalProfile.compatibleDepthsMm
    : settings.gavetaProfundidadesDisponiveisMm;
  const metalHeightOptions = metalProfile?.allowedHeightsMm ?? [];

  const updateDraft = (patch: Partial<DrawerHardwareDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <button
        type="button"
        className="button button-ghost"
        style={{ width: "100%" }}
        onClick={() => {
          if (!open) {
            setDraft(
              createDefaultHardwareDraft(
                drawers[0]
                  ? { ...draftFromDrawer(drawers[0]), slideType: drawerHardware.defaultSystem }
                  : { slideType: drawerHardware.defaultSystem }
              )
            );
          }
          setOpen((v) => !v);
        }}
        disabled={drawers.length === 0}
      >
        {open ? "Ocultar Ferragens (global)" : "Ferragens (global)"}
      </button>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Aplicar as mesmas ferragens a todas as gavetas. Alterações individuais mantém prioridade até voltar a aplicar o global.
          </span>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Corrediça</span>
            <select
              className="select select-xs"
              value={draft.slideType}
              onChange={(e) => updateDraft({ slideType: e.target.value as DrawerSlideType })}
            >
              {DRAWER_SLIDE_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Caixa metálica</span>
            <select
              className="select select-xs"
              value={draft.metalBoxType}
              onChange={(e) => {
                const nextType = e.target.value as DrawerMetalBoxType;
                if (nextType === "Nenhuma") {
                  updateDraft({
                    metalBoxType: nextType,
                    metalBoxProfileId: undefined,
                    metalBoxHeightMm: undefined,
                  });
                  return;
                }
                const profiles = listMetalBoxProfilesForType(nextType);
                const profile = profiles[0] ?? null;
                const height = profile
                  ? resolveMetalBoxHeightMm(profile)
                  : settings.gavetaAlturaCaixaMetalicaMm;
                const depth = profile
                  ? pickCompatibleMetalDepth(profile, draft.nominalDepth)
                  : draft.nominalDepth;
                updateDraft({
                  metalBoxType: nextType,
                  metalBoxProfileId: profile?.id,
                  metalBoxHeightMm: height,
                  slideType: (profile?.defaultSlideType ?? draft.slideType) as DrawerSlideType,
                  nominalDepth: depth,
                });
              }}
            >
              {DRAWER_METAL_BOX_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {metalProfile && listMetalBoxProfilesForType(draft.metalBoxType).length > 1 && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Perfil / sórie</span>
              <select
                className="select select-xs"
                value={metalProfile.id}
                onChange={(e) => {
                  const profile = listMetalBoxProfilesForType(draft.metalBoxType).find(
                    (p) => p.id === e.target.value
                  );
                  if (!profile) return;
                  const height = resolveMetalBoxHeightMm(profile, draft.metalBoxHeightMm);
                  updateDraft({
                    metalBoxProfileId: profile.id,
                    metalBoxHeightMm: height,
                    slideType: profile.defaultSlideType,
                    nominalDepth: pickCompatibleMetalDepth(profile, draft.nominalDepth),
                  });
                }}
              >
                {listMetalBoxProfilesForType(draft.metalBoxType).map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          {metalProfile && metalHeightOptions.length > 0 && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Altura da caixa (mm)</span>
              <select
                className="select select-xs"
                value={draft.metalBoxHeightMm ?? metalHeightOptions[0]}
                onChange={(e) =>
                  updateDraft({ metalBoxHeightMm: Number(e.target.value) || metalHeightOptions[0] })
                }
              >
                {metalHeightOptions.map((h) => (
                  <option key={h} value={h}>
                    {h} mm
                  </option>
                ))}
              </select>
            </label>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={draft.softClose}
              onChange={(e) => updateDraft({ softClose: e.target.checked })}
            />
            Soft-close
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Puxador / handle</span>
            <select
              className="select select-xs"
              value={draft.handleType}
              onChange={(e) => {
                const nextType = e.target.value as DrawerHandleType;
                const defaultProfile = getDefaultProfileForHandleType(nextType);
                updateDraft({
                  handleType: nextType,
                  handleProfileId: defaultProfile?.id,
                  handleCenterDistanceMm: defaultProfile?.defaultCenterDistanceMm,
                });
              }}
            >
              {DRAWER_HANDLE_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Profundidade padrão (mm)</span>
            <select
              className="select select-xs"
              value={draft.nominalDepth}
              onChange={(e) => updateDraft({ nominalDepth: Number(e.target.value) })}
            >
              {depthOptions.map((depth) => (
                <option key={depth} value={depth}>
                  {depth} mm
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="button button-primary"
            style={{ width: "100%" }}
            onClick={() => onApply(draft)}
          >
            Aplicar a todas as gavetas
          </button>
        </div>
      )}
    </div>
  );
}
