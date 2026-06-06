import type { ReactNode } from "react";
import type { NestingV3Settings, NestingV3RotationMode, NestingV3PriorityMode } from "../nestingV3Settings";
import type { V3Sheet } from "../nestingV3Types";

const font = "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

interface Props {
  settings: NestingV3Settings;
  activeSheet?: V3Sheet;
  onUpdateSettings: (patch: Partial<NestingV3Settings>) => void;
  onUpdateActiveSheet?: (patch: Partial<V3Sheet>) => void;
}

export default function NestingV3SettingsPanel({
  settings,
  activeSheet,
  onUpdateSettings,
  onUpdateActiveSheet,
}: Props) {
  return (
    <div style={{ padding: "10px 10px 6px", borderBottom: "1px solid var(--border,rgba(255,255,255,0.1))", fontFamily: font }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-muted,#94a3b8)", marginBottom: 8 }}>
        Configurações de Nesting
      </div>

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
      <Field label="Espaçamento peças (mm)">
        <NumInput value={settings.kerfMm} onChange={(v) => onUpdateSettings({ kerfMm: v })} />
      </Field>
      <Field label="Rotação">
        <select
          value={settings.rotationMode}
          onChange={(e) => onUpdateSettings({ rotationMode: e.target.value as NestingV3RotationMode })}
          className="input input-sm"
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          <option value="none">Sem rotação</option>
          <option value="90">0° / 90°</option>
          <option value="free">Livre</option>
        </select>
      </Field>
      <Field label="Prioridade">
        <select
          value={settings.priorityMode}
          onChange={(e) => onUpdateSettings({ priorityMode: e.target.value as NestingV3PriorityMode })}
          className="input input-sm"
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          <option value="sheets">Menos folhas</option>
          <option value="waste">Menos sobras</option>
          <option value="balanced">Balanceado</option>
        </select>
      </Field>
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
      onChange={(e) => onChange(+e.target.value)}
      className="input input-sm"
      style={{ width: "100%", boxSizing: "border-box" }}
    />
  );
}
