import { useEffect, useState } from "react";
import Panel from "../../../components/ui/Panel";
import { AdminPageHeader, AdminStickyActionBar, adminPageShellStyle } from "../../../components/admin/AdminUi";
import type { RulesFieldDef, RulesStore } from "./types";

type Props<T extends object> = {
  title: string;
  subtitle: string;
  fields: RulesFieldDef[];
  store: RulesStore<T>;
};

export function GenericRulesEditor<T extends object>({ title, subtitle, fields, store }: Props<T>) {
  const [draft, setDraft] = useState<T>(() => store.get());
  const [saved, setSaved] = useState(false);

  useEffect(() => store.subscribe(() => setDraft(store.get())), [store]);

  const sections = groupBySection(fields);

  const setField = (key: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = () => {
    store.set(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const onReset = () => {
    store.reset();
    setDraft(store.get());
  };

  return (
    <div style={adminPageShellStyle}>
      <AdminPageHeader title={title} subtitle={subtitle} />
      <AdminStickyActionBar>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {saved ? "Regras guardadas." : "Alterações pendentes até guardar."}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="button button-sm" onClick={onReset}>
            Repor padrão
          </button>
          <button type="button" className="button button-primary button-sm" onClick={onSave}>
            Guardar
          </button>
        </div>
      </AdminStickyActionBar>

      {sections.map(([section, sectionFields]) => (
        <Panel key={section} title={section}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {sectionFields.map((field) => (
              <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text-main)", fontWeight: 600 }}>{field.label}</span>
                {field.description && (
                  <span style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{field.description}</span>
                )}
                {field.type === "boolean" ? (
                  <input
                    type="checkbox"
                    checked={Boolean((draft as Record<string, unknown>)[field.key])}
                    onChange={(e) => setField(field.key, e.target.checked)}
                  />
                ) : field.type === "select" ? (
                  <select
                    className="input input-sm"
                    value={String((draft as Record<string, unknown>)[field.key] ?? "")}
                    onChange={(e) => setField(field.key, e.target.value)}
                  >
                    {(field.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="input input-sm"
                    type={field.type === "number" ? "number" : "text"}
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 1}
                    value={String((draft as Record<string, unknown>)[field.key] ?? "")}
                    onChange={(e) =>
                      setField(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)
                    }
                  />
                )}
              </label>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function groupBySection(fields: RulesFieldDef[]): Array<[string, RulesFieldDef[]]> {
  const map = new Map<string, RulesFieldDef[]>();
  for (const f of fields) {
    const s = f.section ?? "Geral";
    const list = map.get(s) ?? [];
    list.push(f);
    map.set(s, list);
  }
  return [...map.entries()];
}
