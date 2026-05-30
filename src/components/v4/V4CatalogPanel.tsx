import { useMemo, useState } from "react";
import { CATALOG_ITEMS } from "../../catalog/catalogIndex";
import type { CatalogItem } from "../../catalog/catalogTypes";

interface V4CatalogPanelProps {
  onAdd: (item: CatalogItem) => void;
  onPreview: (item: CatalogItem) => void;
  previewItemId?: string;
}

type SectionKey = "cozinhaBase" | "cozinhaSuperior" | "caixasDeCanto" | "piModels" | "outros";

type CatalogSection = {
  key: SectionKey;
  title: string;
  items: CatalogItem[];
};

const DEFAULT_OPEN: Record<SectionKey, boolean> = {
  cozinhaBase: true,
  cozinhaSuperior: true,
  caixasDeCanto: true,
  piModels: true,
  outros: false,
};

function splitSections(items: CatalogItem[]): CatalogSection[] {
  const caixasDeCanto   = items.filter((i) => i.subcategoriaCatalogo === "caixas-de-canto");
  const cozinhaBase     = items.filter(
    (i) => i.categoria === "base" && i.grupoCatalogo === "br" && i.subcategoriaCatalogo !== "caixas-de-canto"
  );
  const cozinhaSuperior = items.filter(
    (i) => i.categoria === "upper" && i.grupoCatalogo === "br" && i.subcategoriaCatalogo !== "caixas-de-canto"
  );
  const piModels        = items.filter((i) => i.grupoCatalogo === "pi");
  const outros          = items.filter(
    (i) =>
      i.subcategoriaCatalogo !== "caixas-de-canto" &&
      !(i.categoria === "base"  && i.grupoCatalogo === "br") &&
      !(i.categoria === "upper" && i.grupoCatalogo === "br") &&
      i.grupoCatalogo !== "pi"
  );
  return ([
    { key: "caixasDeCanto",   title: "Caixas de Canto",   items: caixasDeCanto   },
    { key: "cozinhaBase",     title: "Cozinha Base",      items: cozinhaBase     },
    { key: "cozinhaSuperior", title: "Cozinha Superior",  items: cozinhaSuperior },
    { key: "piModels",        title: "PI Models",         items: piModels        },
    { key: "outros",          title: "Outros",            items: outros          },
  ] as CatalogSection[]).filter((s) => s.items.length > 0);
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
  const { largura_mm: w, altura_mm: h, profundidade_mm: d } = item.dimensoesDefault;
  return (
    <button
      type="button"
      className={`v4-item-card${selected ? " v4-item-card--selected" : ""}`}
      onClick={() => onPreview(item)}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="v4-item-card__name">{item.nome}</p>
        <p className="v4-item-card__dims">{w} × {h} × {d} mm</p>
      </div>
      <span style={{ fontSize: 12, color: "var(--v4-text-subtle)", flexShrink: 0 }}>›</span>
    </button>
  );
}

export default function V4CatalogPanel({ onPreview, previewItemId }: V4CatalogPanelProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Record<SectionKey, boolean>>(DEFAULT_OPEN);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? CATALOG_ITEMS.filter((i) => i.nome.toLowerCase().includes(term)) : CATALOG_ITEMS;
  }, [search]);

  const sections = useMemo(() => splitSections(filtered), [filtered]);

  return (
    <div className="v4-catalog">
      <div className="v4-catalog__search">
        <input
          type="search"
          placeholder="Pesquisar módulos…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="v4-catalog__body">
        {sections.map((section) => {
          const isOpen = open[section.key];
          return (
            <div key={section.key}>
              <button
                type="button"
                className="v4-catalog__section-header"
                onClick={() => setOpen((p) => ({ ...p, [section.key]: !p[section.key] }))}
              >
                <i className={`v4-catalog__chevron${isOpen ? " v4-catalog__chevron--open" : ""}`}>›</i>
                {section.title}
                <span className="v4-catalog__count">{section.items.length}</span>
              </button>

              {isOpen && section.items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  selected={previewItemId === item.id}
                  onPreview={onPreview}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
