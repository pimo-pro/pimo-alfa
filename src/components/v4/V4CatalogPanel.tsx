import { useMemo, useState } from "react";

import { CATALOG_ITEMS } from "../../catalog/catalogIndex";
import type { CatalogItem } from "../../catalog/catalogTypes";
import { Icon } from "../../components/icons/Icon";

interface V4CatalogPanelProps {
  onAdd: (item: CatalogItem) => void;
  onPreview: (item: CatalogItem) => void;
  previewItemId?: string;
}

type SectionKey = "cozinhaBase" | "cozinhaSuperior" | "piModels" | "outros";

type CatalogSection = {
  key: SectionKey;
  title: string;
  items: CatalogItem[];
};

const DEFAULT_OPEN: Record<SectionKey, boolean> = {
  cozinhaBase: true,
  cozinhaSuperior: true,
  piModels: true,
  outros: true,
};

function splitSections(items: CatalogItem[]): CatalogSection[] {
  const cozinhaBase = items.filter((item) => item.categoria === "base" && item.grupoCatalogo === "br");
  const cozinhaSuperior = items.filter(
    (item) => item.categoria === "upper" && item.grupoCatalogo === "br"
  );
  const piModels = items.filter((item) => item.grupoCatalogo === "pi");
  const outros = items.filter(
    (item) =>
      !(
        (item.categoria === "base" && item.grupoCatalogo === "br") ||
        (item.categoria === "upper" && item.grupoCatalogo === "br") ||
        item.grupoCatalogo === "pi"
      )
  );

  const sections: CatalogSection[] = [
    { key: "cozinhaBase", title: "Mozinha Base", items: cozinhaBase },
    { key: "cozinhaSuperior", title: "Cozinha Superior", items: cozinhaSuperior },
    { key: "piModels", title: "PI Models", items: piModels },
    { key: "outros", title: "Outros", items: outros },
  ];

  return sections.filter((section) => section.items.length > 0);
}

function ItemCard({
  item,
  selected,
  onPreview,
}: {
  item: CatalogItem;
  selected: boolean;
  onPreview: (item: CatalogItem) => void;
}) {
  const w = item.dimensoesDefault.largura_mm;
  const h = item.dimensoesDefault.altura_mm;
  const d = item.dimensoesDefault.profundidade_mm;

  return (
    <button
      type="button"
      onClick={() => onPreview(item)}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 8,
        border: selected
          ? "1px solid var(--color-accent, #f59e0b)"
          : "1px solid var(--color-border, #333)",
        background: "var(--color-surface, #1e1e1e)",
        padding: 10,
        display: "flex",
        gap: 10,
        cursor: "pointer",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 38,
          height: 38,
          borderRadius: 6,
          background: selected ? "#93c5fd" : "#d1d5db",
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--color-text-primary, #f0f0f0)" }}>
          {item.nome}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-text-secondary, #aaa)" }}>
          {w}mm × {h}mm × {d}mm
        </p>
      </div>
    </button>
  );
}

export default function V4CatalogPanel({ onPreview, previewItemId }: V4CatalogPanelProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Record<SectionKey, boolean>>(DEFAULT_OPEN);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return CATALOG_ITEMS;
    return CATALOG_ITEMS.filter((item) => item.nome.toLowerCase().includes(term));
  }, [search]);

  const sections = useMemo(() => splitSections(filtered), [filtered]);

  return (
    <div style={{ height: "100%", overflowY: "auto", overflowX: "hidden", padding: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon name="furniture" size={16} />
        <strong style={{ fontSize: 13 }}>Móveis</strong>
      </div>

      <input
        type="search"
        placeholder="Pesquisar por nome"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          borderRadius: 8,
          border: "1px solid var(--color-border, #333)",
          background: "var(--color-surface, #1e1e1e)",
          color: "var(--color-text-primary, #f0f0f0)",
          padding: "8px 10px",
          fontSize: 12,
          marginBottom: 10,
        }}
      />

      {sections.map((section) => {
        const isOpen = open[section.key];
        return (
          <section key={section.key} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setOpen((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
              style={{
                border: "1px solid var(--color-border, #333)",
                background: "var(--color-surface, #1e1e1e)",
                color: "var(--color-text-primary, #f0f0f0)",
                borderRadius: 8,
                padding: "6px 8px",
                textAlign: "left",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {isOpen ? "▼" : "▶"} {section.title} ({section.items.length})
            </button>

            {isOpen
              ? section.items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    selected={previewItemId === item.id}
                    onPreview={onPreview}
                  />
                ))
              : null}
          </section>
        );
      })}
    </div>
  );
}
