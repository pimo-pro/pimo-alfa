import type { ReactNode } from "react";
import type {
  NestingV4Settings,
  NestingV4RotationMode,
  NestingV4PriorityMode,
  NestingV4EngineId,
} from "../nestingV4Settings";
import type { V4Sheet } from "../nestingV4Types";

const font = "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

interface Props {
  settings: NestingV4Settings;
  activeSheet?: V4Sheet;
  onUpdateSettings: (patch: Partial<NestingV4Settings>) => void;
  onUpdateActiveSheet?: (patch: Partial<V4Sheet>) => void;
}

export default function NestingV4SettingsPanel({
  settings,
  activeSheet,
  onUpdateSettings,
  onUpdateActiveSheet,
}: Props) {
  return (
    <div style={{ padding: "10px 10px 6px", borderBottom: "1px solid var(--border,rgba(255,255,255,0.1))", fontFamily: font }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-muted,#94a3b8)", marginBottom: 8 }}>
        Nesting V4 — Visual / Análise
      </div>

      <Field label="Motor">
        <select
          value={settings.nestingEngine}
          onChange={(e) =>
            onUpdateSettings({ nestingEngine: e.target.value as NestingV4EngineId })
          }
          className="input input-sm"
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          <option value="pro">Nesting PRO (industrial)</option>
          <option value="experimental">Nesting Experimental (novo)</option>
          <option value="deepnest">Nesting Deepnest (MIT)</option>
        </select>
      </Field>

      <Field label="L folha (mm)">
        <NumInput
          value={activeSheet?.widthMm ?? settings.sheetWidthMm}
          onChange={(v) => {
            if (onUpdateActiveSheet) onUpdateActiveSheet({ widthMm: v });
            else onUpdateSettings({ sheetWidthMm: v });
          }}
        />
      </Field>
      <Field label="A folha (mm)">
        <NumInput
          value={activeSheet?.heightMm ?? settings.sheetHeightMm}
          onChange={(v) => {
            if (onUpdateActiveSheet) onUpdateActiveSheet({ heightMm: v });
            else onUpdateSettings({ sheetHeightMm: v });
          }}
        />
      </Field>
      <Field label="E folha (mm)">
        <NumInput
          value={activeSheet?.thicknessMm ?? settings.sheetThicknessMm}
          onChange={(v) => {
            if (onUpdateActiveSheet) onUpdateActiveSheet({ thicknessMm: v });
            else onUpdateSettings({ sheetThicknessMm: v });
          }}
        />
      </Field>
      <Field label="Margem folha (mm)">
        <NumInput value={settings.marginMm} onChange={(v) => onUpdateSettings({ marginMm: v })} />
      </Field>
      <Field label="Kerf / espaçamento (mm)">
        <NumInput value={settings.kerfMm} onChange={(v) => onUpdateSettings({ kerfMm: v })} />
      </Field>
      <Field label="Rotação">
        <select
          value={settings.rotationMode}
          onChange={(e) => onUpdateSettings({ rotationMode: e.target.value as NestingV4RotationMode })}
          className="input input-sm"
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          <option value="none">Sem rotação</option>
          <option value="90">0° / 90°</option>
          <option value="free">Livre (visual)</option>
        </select>
      </Field>
      <Field label="Prioridade">
        <select
          value={settings.priorityMode}
          onChange={(e) => onUpdateSettings({ priorityMode: e.target.value as NestingV4PriorityMode })}
          className="input input-sm"
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          <option value="sheets">Menos folhas</option>
          <option value="waste">Menos sobras</option>
          <option value="balanced">Balanceado</option>
        </select>
      </Field>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginBottom: 6, color: "var(--text-main,#e2e8f0)" }}>
        <input
          type="checkbox"
          checked={settings.showGrainHatch}
          onChange={(e) => onUpdateSettings({ showGrainHatch: e.target.checked })}
        />
        Hachura de veio (grain)
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginBottom: 6, color: "var(--text-main,#e2e8f0)" }}>
        <input
          type="checkbox"
          checked={settings.showWasteOverlay}
          onChange={(e) => onUpdateSettings({ showWasteOverlay: e.target.checked })}
        />
        Mostrar desperdício
      </label>
      <p style={{ margin: "8px 0 0", fontSize: 9, color: "var(--text-muted,#94a3b8)", lineHeight: 1.35 }}>
        Estação visual/análise. O CNC de produção continua exclusivo em nesting_mo (SSOT).
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 6 }}>
      <span style={{ display: "block", fontSize: 9, color: "var(--text-muted,#94a3b8)", marginBottom: 2 }}>{label}</span>
      {children}
    </label>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="input input-sm"
      style={{ width: "100%", boxSizing: "border-box" }}
    />
  );
}
