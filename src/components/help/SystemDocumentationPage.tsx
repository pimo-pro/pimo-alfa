/**
 * Centro oficial de documentação técnica — READ-ONLY.
 */

import type { ComponentType } from "react";
import { HELP_DOC_THEME as T } from "./helpDocTheme";
import {
  SYSTEM_DOC_CATEGORIES,
  type SystemDocCategoryId,
  getCategoryMeta,
} from "../../utils/loadSystemDoc";
import DrawersSystemDocs from "./system/DrawersSystemDocs";
import DoorsSystemDocs from "./system/DoorsSystemDocs";
import CncSystemDocs from "./system/CncSystemDocs";
import PiSystemDocs from "./system/PiSystemDocs";
import PdfSystemDocs from "./system/PdfSystemDocs";
import ViewerSystemDocs from "./system/ViewerSystemDocs";
import UiSystemDocs from "./system/UiSystemDocs";
import SettingsSystemDocs from "./system/SettingsSystemDocs";

const CATEGORY_COMPONENTS: Record<SystemDocCategoryId, ComponentType> = {
  drawers: DrawersSystemDocs,
  doors: DoorsSystemDocs,
  cnc: CncSystemDocs,
  pi: PiSystemDocs,
  pdf: PdfSystemDocs,
  viewer: ViewerSystemDocs,
  ui: UiSystemDocs,
  settings: SettingsSystemDocs,
};

type SystemDocCategoryMeta = NonNullable<ReturnType<typeof getCategoryMeta>>;

type Props = {
  category: SystemDocCategoryId;
  onCategoryChange: (id: SystemDocCategoryId) => void;
  onBackToUserHelp: () => void;
};

function Breadcrumbs({
  category,
  onBackToUserHelp,
}: {
  category: SystemDocCategoryMeta | undefined;
  onBackToUserHelp: () => void;
}) {
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.muted, marginBottom: 20, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={onBackToUserHelp}
        style={{ background: "none", border: "none", color: T.accent, cursor: "pointer", padding: 0, fontSize: 11 }}
      >
        Ajuda
      </button>
      <span>/</span>
      <span style={{ color: T.text }}>System Documentation</span>
      {category ? (
        <>
          <span>/</span>
          <span style={{ color: T.engineering }}>{category.label}</span>
        </>
      ) : null}
    </nav>
  );
}

export default function SystemDocumentationPage({ category, onCategoryChange, onBackToUserHelp }: Props) {
  const meta = getCategoryMeta(category);
  const Content = CATEGORY_COMPONENTS[category];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }}>
      <aside
        style={{
          position: "sticky",
          top: 16,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: "8px 6px",
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: T.muted, padding: "4px 10px 8px", margin: 0 }}>
          Categorias
        </p>
        {SYSTEM_DOC_CATEGORIES.map((cat) => {
          const active = cat.id === category;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "7px 10px",
                borderRadius: 7,
                border: `1px solid ${active ? T.engineering + "40" : "transparent"}`,
                background: active ? `${T.engineering}14` : "transparent",
                color: active ? T.engineering : cat.available ? T.muted : T.muted + "99",
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                fontFamily: T.font,
                marginBottom: 2,
              }}
            >
              {cat.label}
              {!cat.available ? " ·" : ""}
            </button>
          );
        })}
        <p style={{ margin: "12px 10px 4px", fontSize: 10, color: T.muted, lineHeight: 1.5 }}>
          Modo leitura — sem alteração de comportamento industrial.
        </p>
      </aside>

      <div>
        <Breadcrumbs category={meta} onBackToUserHelp={onBackToUserHelp} />
        <header style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 10,
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              background: "rgba(56,189,248,0.1)",
              color: T.engineering,
              border: "1px solid rgba(56,189,248,0.25)",
            }}
          >
            System Documentation
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: "clamp(1.4rem,3vw,1.9rem)", fontWeight: 800, color: T.text }}>
            {meta?.label ?? "Documentação"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6, maxWidth: 640 }}>
            {meta?.description}
          </p>
          {meta?.sourceFiles.length ? (
            <p style={{ margin: "10px 0 0", fontSize: 11, color: T.muted }}>
              Fontes: {meta.sourceFiles.map((f) => (
                <code key={f} style={{ marginRight: 8, color: T.accent }}>
                  {f}
                </code>
              ))}
            </p>
          ) : null}
        </header>
        <Content />
      </div>
    </div>
  );
}
