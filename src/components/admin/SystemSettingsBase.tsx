import { getSettings } from "../../core/settings/settingsService";

export default function SystemSettingsBase() {
  const currentSettings = getSettings();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>
        System Settings (Base)
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Módulo preparado para evolução futura. Esta base define schema e serviço inicial,
        mas permanece fora do menu principal até implementação completa.
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          padding: "10px 12px",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        Preview do schema base atual: locale={currentSettings.locale}, theme={currentSettings.theme},
        autosaveEnabled={String(currentSettings.autosaveEnabled)}
      </div>
    </div>
  );
}
